// scripts/cloud_whisprs_publisher.mjs - Cloud-to-Buffer Scheduler for GitHub Actions (Whisprs)
// Pre-schedules upcoming posts directly onto Buffer at exact 8:00 AM & 8:00 PM Africa/Casablanca slots
// using Buffer's `customScheduled` mode so GitHub Actions cron delays never shift publish times.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const QUEUE_FILE = path.join(ROOT_DIR, 'jobs', 'whisprs_cloud_publish_queue.json');

// Auto-load .env if present
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').trim().replace(/\r$/, '');
    }
  }
}

const BUFFER_TOKEN = process.env.BUFFER_WHISPRS_TOKEN || process.env.BUFFER_TOKEN || 'qCPomK5ZlArTbBXmkzHsrI_7eoyD4NnZmXcgDkNTJh-';
const BUFFER_API_URL = 'https://api.buffer.com';
const BUFFER_ORG_ID = '6afb004bbbd80f569946189e';
const TIMEZONE = 'Africa/Casablanca';
const SLOT_TIMES = ['08:00:00', '20:00:00'];
const TARGET_BUFFERED_SLOTS = Math.min(Math.max(Number(process.env.WHISPRS_BUFFERED_SLOTS || 2), 1), 6);
const BUFFER_FREE_MAX_SCHEDULED = 9; // Hard cap safely below Buffer Free's 10-post queue limit
const MIN_LEAD_MS = 20 * 60 * 1000;
const YOUTUBE_DAILY_MAX = 2;

const CHANNELS = [
  {
    channelName: "YouTube Shorts (Vesper's)",
    channelId: '6afb0092ece6dfde5fe41003',
    service: 'youtube'
  },
  {
    channelName: "Facebook Reels (Vesper)",
    channelId: '6afb007cece6dfde5fe40e7d',
    service: 'facebook'
  }
];

async function queryBuffer(query, variables = {}) {
  const res = await fetch(BUFFER_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BUFFER_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, variables })
  });
  return res.json();
}

// Convert YYYY-MM-DD + HH:MM:SS in target IANA timezone to exact UTC Date
function localToUtc(dateStr, timeStr, timeZone = TIMEZONE) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min, s] = timeStr.split(':').map(Number);
  let candidate = new Date(Date.UTC(y, m - 1, d, h, min, s));

  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    }).formatToParts(candidate);

    const p = {};
    parts.forEach(part => { p[part.type] = Number(part.value); });
    if (p.hour === 24) p.hour = 0;

    const currentLocalMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const desiredLocalMs = Date.UTC(y, m - 1, d, h, min, s);
    const diff = desiredLocalMs - currentLocalMs;
    if (diff === 0) break;
    candidate = new Date(candidate.getTime() + diff);
  }
  return candidate;
}

function getLocalDateKey(date, timeZone = TIMEZONE) {
  return date.toLocaleDateString('en-CA', { timeZone });
}

async function fetchChannelPosts(channelId) {
  const query = `
    query GetChannelPosts($orgId: OrganizationId!, $channelIds: [ChannelId!]) {
      posts(
        input: {
          organizationId: $orgId
          filter: { channelIds: $channelIds, status: [scheduled, sent, sending] }
          sort: [{ field: dueAt, direction: desc }]
        }
        first: 30
      ) {
        edges {
          node {
            id
            status
            dueAt
            sentAt
          }
        }
      }
    }
  `;
  const res = await queryBuffer(query, { orgId: BUFFER_ORG_ID, channelIds: [channelId] });
  if (res.errors?.length) {
    throw new Error(`Buffer posts query failed for ${channelId}: ${res.errors[0].message}`);
  }
  return (res.data?.posts?.edges || []).map(e => e.node);
}

async function fetchDailyLimits() {
  const query = `
    query GetDailyLimits($input: DailyPostingLimitsInput!) {
      dailyPostingLimits(input: $input) {
        channelId
        isAtLimit
        limit
        scheduled
        sent
      }
    }
  `;
  const res = await queryBuffer(query, { input: { channelIds: CHANNELS.map(c => c.channelId) } });
  if (res.errors?.length) {
    throw new Error(`Buffer dailyPostingLimits query failed: ${res.errors[0].message}`);
  }
  return res.data?.dailyPostingLimits || [];
}

function getPostTimestampMs(post) {
  const iso = post.sentAt || post.dueAt;
  return iso ? new Date(iso).getTime() : NaN;
}

function isSlotSafe(slotDate, postsByChannel, youtubeChannelId) {
  const slotMs = slotDate.getTime();
  const slotDayKey = getLocalDateKey(slotDate);
  const oneDayMs = 24 * 3600 * 1000;

  // Avoid double-booking the same morning/evening window on either channel
  for (const ch of CHANNELS) {
    const chPosts = postsByChannel[ch.channelId] || [];
    const nearExisting = chPosts.some(p => {
      const t = getPostTimestampMs(p);
      return Number.isFinite(t) && Math.abs(t - slotMs) < 2 * 3600 * 1000;
    });
    if (nearExisting) return false;
  }

  // Enforce YouTube's strict 2/day & rolling-24h cap across sent + scheduled posts
  const ytPosts = postsByChannel[youtubeChannelId] || [];
  const sameDayCount = ytPosts.filter(p => {
    const t = getPostTimestampMs(p);
    return Number.isFinite(t) && getLocalDateKey(new Date(t)) === slotDayKey;
  }).length;
  if (sameDayCount >= YOUTUBE_DAILY_MAX) return false;

  const trailing24hCount = ytPosts.filter(p => {
    const t = getPostTimestampMs(p);
    return Number.isFinite(t) && t <= slotMs && (slotMs - t) < (oneDayMs - 15 * 60 * 1000);
  }).length;
  if (trailing24hCount >= YOUTUBE_DAILY_MAX) return false;

  const forward24hCount = ytPosts.filter(p => {
    const t = getPostTimestampMs(p);
    return Number.isFinite(t) && t >= slotMs && (t - slotMs) < (oneDayMs - 15 * 60 * 1000);
  }).length;
  if (forward24hCount >= YOUTUBE_DAILY_MAX) return false;

  return true;
}

function findNextSafeSlot(postsByChannel, youtubeChannelId) {
  const now = new Date();
  for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
    const baseDate = new Date(now.getTime() + dayOffset * 24 * 3600 * 1000);
    const dateStr = getLocalDateKey(baseDate);

    for (const timeStr of SLOT_TIMES) {
      const slotDate = localToUtc(dateStr, timeStr, TIMEZONE);
      if (slotDate.getTime() <= now.getTime() + MIN_LEAD_MS) continue;
      if (isSlotSafe(slotDate, postsByChannel, youtubeChannelId)) {
        return slotDate;
      }
    }
  }
  throw new Error('Could not find an available 8:00 AM / 8:00 PM slot within 30 days.');
}

async function createBufferPost({ channelId, service, text, title, videoUrl, dueAt }) {
  const metadata = {};
  if (service === 'youtube') {
    metadata.youtube = {
      title: (title || 'Whisprs Poetry #Shorts').slice(0, 95),
      privacy: 'public',
      madeForKids: false,
      categoryId: '22'
    };
  } else if (service === 'facebook') {
    metadata.facebook = {
      type: 'reel'
    };
  }

  const input = {
    channelId,
    text,
    schedulingType: 'automatic',
    mode: 'customScheduled',
    dueAt,
    needsApproval: false,
    assets: [{ video: { url: videoUrl } }],
    metadata
  };

  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
            status
            dueAt
          }
        }
        ... on InvalidInputError {
          message
        }
        ... on LimitReachedError {
          message
        }
        ... on UnexpectedError {
          message
        }
      }
    }
  `;

  return queryBuffer(mutation, { input });
}

export async function runDailyWhisprsPublish({ dryRun = false } = {}) {
  console.log(`[Cloud Scheduler] Starting Whisprs Buffer scheduler at ${new Date().toISOString()} (dryRun=${dryRun})...`);

  if (!fs.existsSync(QUEUE_FILE)) {
    console.error(`[Cloud Scheduler] Queue file not found: ${QUEUE_FILE}`);
    return { ok: false, error: 'Queue file missing' };
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
  } catch (e) {
    console.error(`[Cloud Scheduler] Failed to parse queue:`, e.message);
    return { ok: false, error: e.message };
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const pendingItems = items.filter(i => i.status === 'pending');

  if (pendingItems.length === 0) {
    console.log(`[Cloud Scheduler] All videos scheduled/published! Queue is empty. Please add more stock.`);
    return { ok: true, message: 'Queue empty', scheduledCount: 0 };
  }

  const youtubeChannelId = CHANNELS.find(c => c.service === 'youtube').channelId;
  const postsByChannel = {};
  for (const ch of CHANNELS) {
    postsByChannel[ch.channelId] = await fetchChannelPosts(ch.channelId);
  }
  const limits = await fetchDailyLimits();

  // Count how many upcoming scheduled slots each channel already has queued in Buffer
  const existingFutureCounts = CHANNELS.map(ch => {
    const futurePosts = postsByChannel[ch.channelId].filter(p => p.status === 'scheduled');
    const lim = limits.find(l => l.channelId === ch.channelId);
    console.log(
      `[Cloud Scheduler] ${ch.channelName}: scheduled=${futurePosts.length}` +
      (lim ? ` (dailySent=${lim.sent}/${lim.limit ?? '∞'})` : '')
    );
    return Math.max(futurePosts.length, lim?.scheduled || 0);
  });

  const currentMaxScheduled = Math.max(...existingFutureCounts, 0);
  if (currentMaxScheduled >= BUFFER_FREE_MAX_SCHEDULED) {
    console.log(`[Cloud Scheduler] Buffer queue near free cap (${currentMaxScheduled} scheduled). Skipping.`);
    return { ok: true, message: 'Buffer queue near cap', scheduledCount: 0 };
  }

  const slotsToFill = Math.min(TARGET_BUFFERED_SLOTS - currentMaxScheduled, pendingItems.length);
  if (slotsToFill <= 0) {
    console.log(`[Cloud Scheduler] Already have ${currentMaxScheduled} upcoming slot(s) scheduled (target: ${TARGET_BUFFERED_SLOTS}). Nothing to add.`);
    return { ok: true, message: 'Target buffer already filled', scheduledCount: 0 };
  }

  const scheduledRuns = [];
  for (let i = 0; i < slotsToFill; i++) {
    const nextItem = pendingItems[i];
    if (!nextItem.cloudVideoUrl) {
      console.error(`[Cloud Scheduler] Item ${nextItem.id} is missing cloudVideoUrl! Marking error_missing_url.`);
      nextItem.status = 'error_missing_url';
      continue;
    }

    const slotDate = findNextSafeSlot(postsByChannel, youtubeChannelId);
    const dueAtIso = slotDate.toISOString();
    const localLabel = slotDate.toLocaleString('en-GB', { timeZone: TIMEZONE, timeZoneName: 'short' });

    console.log(`\n[Cloud Scheduler] Slot #${i + 1}: "${nextItem.title || nextItem.id}"`);
    console.log(`[Cloud Scheduler] Target Buffer time: ${dueAtIso} (${localLabel})`);

    if (dryRun) {
      // Reserve virtual slot in memory so multiple dry-run iterations advance properly
      for (const ch of CHANNELS) {
        postsByChannel[ch.channelId].push({ id: `dry_${i}`, status: 'scheduled', dueAt: dueAtIso });
      }
      scheduledRuns.push({ id: nextItem.id, dueAt: dueAtIso, dryRun: true });
      continue;
    }

    const dispatched = [];
    let allSuccess = true;

    for (const ch of CHANNELS) {
      console.log(`[Cloud Scheduler] Scheduling on ${ch.channelName} for ${dueAtIso}...`);
      try {
        const res = await createBufferPost({
          channelId: ch.channelId,
          service: ch.service,
          text: nextItem.caption,
          title: nextItem.title,
          videoUrl: nextItem.cloudVideoUrl,
          dueAt: dueAtIso
        });

        const post = res.data?.createPost?.post;
        if (post && post.id && post.status !== 'error') {
          console.log(`[Cloud Scheduler] ✓ ${ch.channelName} SCHEDULED (Post ID: ${post.id}, Status: ${post.status}, Due: ${post.dueAt})`);
          dispatched.push({
            channel: ch.channelName,
            channelId: ch.channelId,
            postId: post.id,
            dueAt: post.dueAt,
            status: post.status
          });
          postsByChannel[ch.channelId].push({ id: post.id, status: post.status, dueAt: post.dueAt || dueAtIso });
        } else {
          const errMsg = res.data?.createPost?.message || (post?.status === 'error' ? 'Buffer returned error status' : JSON.stringify(res.errors || res));
          console.error(`[Cloud Scheduler] ✗ ${ch.channelName} FAILED:`, errMsg);
          dispatched.push({
            channel: ch.channelName,
            channelId: ch.channelId,
            ...(post?.id ? { postId: post.id } : {}),
            error: errMsg,
            status: 'error'
          });
          allSuccess = false;
        }
      } catch (err) {
        console.error(`[Cloud Scheduler] ✗ ${ch.channelName} EXCEPTION:`, err.message);
        dispatched.push({
          channel: ch.channelName,
          channelId: ch.channelId,
          error: err.message,
          status: 'error'
        });
        allSuccess = false;
      }
    }

    const anySucceeded = dispatched.some(d => d.postId && d.status !== 'error');
    nextItem.status = allSuccess ? 'scheduled' : (anySucceeded ? 'partially_scheduled' : 'pending');
    nextItem.scheduledAt = new Date().toISOString();
    nextItem.scheduledSlot = dueAtIso;
    nextItem.scheduledDueAt = dueAtIso;
    nextItem.dispatchedPosts = dispatched;
    scheduledRuns.push({ id: nextItem.id, status: nextItem.status, dueAt: dueAtIso, dispatched });

    if (!allSuccess) {
      console.warn(`[Cloud Scheduler] Stopping loop early due to partial/failed dispatch.`);
      break;
    }
  }

  if (!dryRun) {
    data.updatedAt = new Date().toISOString();
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`\n[Cloud Scheduler] Queue saved (${QUEUE_FILE}).`);
  }

  return { ok: true, scheduledCount: scheduledRuns.length, scheduledRuns };
}

// If executed directly
const isMain = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);
if (isMain) {
  const dryRun = process.argv.includes('--dry-run');
  runDailyWhisprsPublish({ dryRun }).then(res => {
    if (!res.ok) process.exit(1);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
