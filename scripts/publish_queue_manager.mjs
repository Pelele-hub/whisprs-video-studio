// scripts/publish_queue_manager.mjs - Robust Queue Manager & Auto-Dispatcher for Buffer (Whisprs Studio)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const JOBS_DIR = path.join(ROOT_DIR, 'jobs');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const QUEUE_FILE = path.join(JOBS_DIR, 'whisprs_publish_queue.json');

export const BUFFER_TOKEN = 'qCPomK5ZlArTbBXmkzHsrI_7eoyD4NnZmXcgDkNTJh-';
export const BUFFER_API_URL = 'https://api.buffer.com';
export const BUFFER_ORG_ID = '6afb004bbbd80f569946189e';

export const CHANNELS = [
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

if (!fs.existsSync(JOBS_DIR)) {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

// Load queue from disk
export function loadQueue() {
  if (!fs.existsSync(QUEUE_FILE)) {
    fs.writeFileSync(QUEUE_FILE, JSON.stringify({ items: [] }, null, 2), 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(QUEUE_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data.items) ? data.items : [];
  } catch (e) {
    console.error('[Whisprs Queue Manager] Error parsing queue file:', e);
    return [];
  }
}

// Save queue to disk
export function saveQueue(items) {
  fs.writeFileSync(QUEUE_FILE, JSON.stringify({ items, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
}

// Add a video to queue
export function addToQueue({ jobId, title, caption, videoFilename, hook, script, hashtags, engine }) {
  const items = loadQueue();
  const existing = items.find(i => i.jobId === jobId || i.videoFilename === videoFilename);
  if (existing) {
    console.log(`[Whisprs Queue Manager] Video ${jobId || videoFilename} already exists in queue (status: ${existing.status}).`);
    return existing;
  }

  const defaultHashtags = '#whisprs #poetry #quotes #deepthoughts #reels #shorts';
  const formattedTags = Array.isArray(hashtags) ? hashtags.join(' ') : (hashtags || defaultHashtags);

  const formattedCaption = caption || (
    hook 
      ? `${hook}\n\n"${script || ''}"\n\nFollow for quiet reminders and late-night thoughts. 🖤✨\n\n${formattedTags}`
      : `${title || 'Whisprs Video'}\n\n${formattedTags}`
  );

  const newItem = {
    id: `whisprs_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    jobId: jobId || `whisprs_${Date.now()}`,
    title: title || 'Whisprs Poetry',
    caption: formattedCaption,
    hook: hook || '',
    script: script || '',
    hashtags: formattedTags,
    videoFilename,
    engine: engine || 'google_flow_and_qwen_0.6',
    status: 'pending', // 'pending' | 'scheduled' | 'failed'
    createdAt: new Date().toISOString(),
    scheduledAt: null,
    scheduledDueAt: null,
    dispatchedPosts: []
  };

  items.push(newItem);
  saveQueue(items);
  console.log(`[Whisprs Queue Manager] Added ${videoFilename} to queue as pending. Total items: ${items.length}`);
  return newItem;
}

// Helper to query Buffer GraphQL
export async function queryBuffer(query, variables = {}) {
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

// Check real-time Buffer slots across channels
export async function checkBufferLimits() {
  const channelIds = CHANNELS.map(c => c.channelId);
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
  try {
    const res = await queryBuffer(query, { input: { channelIds } });
    if (res.errors && res.errors.length > 0) {
      console.warn('[Whisprs Queue Manager] Buffer limits query error:', res.errors);
      return { ok: false, error: res.errors[0].message };
    }

    const limits = res.data?.dailyPostingLimits || [];
    const channelStatus = limits.map(l => {
      const ch = CHANNELS.find(c => c.channelId === l.channelId);
      return {
        channelName: ch ? ch.channelName : l.channelId,
        channelId: l.channelId,
        scheduled: l.scheduled || 0,
        isAtLimit: l.isAtLimit || false,
        limit: l.limit
      };
    });

    // In Buffer Free tier, max scheduled posts is typically 10 items total
    const maxScheduled = Math.max(...channelStatus.map(c => c.scheduled), 0);
    const anyAtLimit = channelStatus.some(c => c.isAtLimit);
    const canSchedule = !anyAtLimit && maxScheduled < 10;

    return {
      ok: true,
      canSchedule,
      maxScheduled,
      anyAtLimit,
      channelStatus
    };
  } catch (err) {
    console.error('[Whisprs Queue Manager] Network error querying Buffer:', err);
    return { ok: false, error: err.message };
  }
}

// Helper to convert local time to UTC for a specific timezone
function localToUtc(dateStr, timeStr, timeZone = 'Africa/Casablanca') {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [h, min, s] = timeStr.split(':').map(Number);
  let candidate = new Date(Date.UTC(y, m - 1, d, h, min, s));

  for (let i = 0; i < 3; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', second: 'numeric',
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

// Calculate next scheduled slot: 2 videos per day at 8:00 AM (08:00) and 8:00 PM (20:00) Casablanca time
export function getNextSlot(scheduledItems = []) {
  const assignedTimestamps = new Set();
  scheduledItems.forEach(item => {
    if (item.scheduledDueAt) {
      assignedTimestamps.add(new Date(item.scheduledDueAt).toISOString());
    }
  });

  const now = new Date();
  let dayOffset = 0;

  while (dayOffset < 60) {
    const baseDate = new Date(now.getTime() + dayOffset * 24 * 3600 * 1000);
    const dateStr = baseDate.toLocaleDateString('en-CA', { timeZone: 'Africa/Casablanca' });

    for (const timeStr of ['08:00:00', '20:00:00']) {
      const utcDate = localToUtc(dateStr, timeStr, 'Africa/Casablanca');
      // Must be at least 15 minutes in the future
      if (utcDate.getTime() > now.getTime() + 15 * 60 * 1000) {
        const iso = utcDate.toISOString();
        if (!assignedTimestamps.has(iso)) {
          return utcDate;
        }
      }
    }
    dayOffset++;
  }

  // Fallback: 1 hour from now
  return new Date(now.getTime() + 3600 * 1000);
}

// Create Buffer Post Mutation (Supports customScheduled at exact dueAt)
export async function createBufferPost({ channelId, service, text, title, videoUrl, dueAt }) {
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
    mode: dueAt ? 'customScheduled' : 'addToQueue',
    needsApproval: false,
    assets: [
      {
        video: {
          url: videoUrl
        }
      }
    ],
    metadata
  };

  if (dueAt) {
    input.dueAt = dueAt;
  }

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

// Dispatch the next pending video if Buffer has available slots
export async function dispatchNext({ publicBaseUrl } = {}) {
  const items = loadQueue();
  const pendingItems = items.filter(i => i.status === 'pending');

  if (pendingItems.length === 0) {
    return {
      dispatched: false,
      message: 'Queue is empty (no pending videos to dispatch)',
      pendingCount: 0
    };
  }

  // 1. Check Buffer limits
  const limits = await checkBufferLimits();
  if (!limits.ok) {
    return {
      dispatched: false,
      message: `Failed to check Buffer limits: ${limits.error}`,
      pendingCount: pendingItems.length
    };
  }

  if (!limits.canSchedule) {
    return {
      dispatched: false,
      message: `Buffer queue is currently full (${limits.maxScheduled} scheduled, limit reached: ${limits.anyAtLimit}). Waiting for a post to go live.`,
      pendingCount: pendingItems.length,
      channelStatus: limits.channelStatus
    };
  }

  // 2. Pick oldest pending item
  const itemToDispatch = pendingItems[0];
  const videoFilePath = path.join(OUTPUT_DIR, itemToDispatch.videoFilename);

  if (!fs.existsSync(videoFilePath)) {
    itemToDispatch.status = 'failed';
    itemToDispatch.error = `File not found on disk: ${itemToDispatch.videoFilename}`;
    saveQueue(items);
    return {
      dispatched: false,
      message: `Error: Video file not found: ${videoFilePath}`,
      failedItem: itemToDispatch.id
    };
  }

  // 3. Construct video URL (requires public URL for Buffer ingestion)
  if (!publicBaseUrl) {
    return {
      dispatched: false,
      message: 'No publicBaseUrl available. Ensure server.mjs tunnel is connected.',
      pendingCount: pendingItems.length
    };
  }

  const streamUrl = `${publicBaseUrl}/stream/${encodeURIComponent(itemToDispatch.videoFilename)}`;

  // 4. Compute next unassigned 8:00 AM or 8:00 PM Casablanca slot
  const scheduledItems = items.filter(i => i.status === 'scheduled');
  const targetSlot = getNextSlot(scheduledItems);
  const dueAtIso = targetSlot.toISOString();
  console.log(`[Whisprs Queue Manager] Dispatching ${itemToDispatch.videoFilename} to Buffer via ${streamUrl}...`);
  console.log(`[Whisprs Queue Manager] Target Publication Slot: ${dueAtIso} (Casablanca 8:00 AM / 8:00 PM schedule)`);

  const dispatchResults = [];
  let allSuccess = true;

  for (const ch of CHANNELS) {
    try {
      console.log(`[Whisprs Queue Manager] Submitting to ${ch.channelName} for ${dueAtIso}...`);
      const res = await createBufferPost({
        channelId: ch.channelId,
        service: ch.service,
        text: itemToDispatch.caption,
        title: itemToDispatch.title,
        videoUrl: streamUrl,
        dueAt: dueAtIso
      });

      const createPostResult = res.data?.createPost;
      if (createPostResult?.post) {
        dispatchResults.push({
          channel: ch.channelName,
          postId: createPostResult.post.id,
          dueAt: createPostResult.post.dueAt,
          status: 'success'
        });
      } else {
        const errMsg = createPostResult?.message || JSON.stringify(res.errors || res);
        console.warn(`[Whisprs Queue Manager] Failed for ${ch.channelName}:`, errMsg);
        dispatchResults.push({
          channel: ch.channelName,
          error: errMsg,
          status: 'error'
        });
        allSuccess = false;
      }
    } catch (e) {
      console.error(`[Whisprs Queue Manager] Exception creating post for ${ch.channelName}:`, e);
      dispatchResults.push({
        channel: ch.channelName,
        error: e.message,
        status: 'error'
      });
      allSuccess = false;
    }
  }

  if (allSuccess) {
    itemToDispatch.status = 'scheduled';
    itemToDispatch.scheduledAt = new Date().toISOString();
    itemToDispatch.scheduledDueAt = dueAtIso;
    itemToDispatch.dispatchedPosts = dispatchResults;
    saveQueue(items);
    console.log(`[Whisprs Queue Manager] SUCCESS: Video ${itemToDispatch.videoFilename} scheduled for ${dueAtIso} across YouTube and Facebook!`);
    return {
      dispatched: true,
      message: `Successfully scheduled ${itemToDispatch.videoFilename} for ${dueAtIso} on YouTube Shorts and Facebook Reels`,
      jobId: itemToDispatch.jobId,
      dueAt: dueAtIso,
      dispatchedPosts: dispatchResults,
      remainingPending: pendingItems.length - 1
    };
  } else {
    itemToDispatch.dispatchedPosts = dispatchResults;
    saveQueue(items);
    return {
      dispatched: false,
      message: `Partial dispatch error for ${itemToDispatch.videoFilename}`,
      dispatchedPosts: dispatchResults,
      remainingPending: pendingItems.length
    };
  }
}
