// scripts/cloud_whisprs_publisher.mjs - 24/7 Cloud Publisher for GitHub Actions (Whisprs)
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

async function createBufferPost({ channelId, service, text, title, videoUrl }) {
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
    mode: 'shareNow', // Direct broadcast - publishes immediately
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

export async function runDailyWhisprsPublish() {
  console.log(`[Cloud Publisher] Starting Whisprs publication run at ${new Date().toISOString()}...`);

  if (!fs.existsSync(QUEUE_FILE)) {
    console.error(`[Cloud Publisher] Queue file not found: ${QUEUE_FILE}`);
    return { ok: false, error: 'Queue file missing' };
  }

  const raw = fs.readFileSync(QUEUE_FILE, 'utf-8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error(`[Cloud Publisher] Failed to parse queue:`, e.message);
    return { ok: false, error: e.message };
  }

  const items = Array.isArray(data.items) ? data.items : [];
  const nextItem = items.find(i => i.status === 'pending');

  if (!nextItem) {
    console.log(`[Cloud Publisher] All videos published! Queue is empty. Please add more stock.`);
    return { ok: true, message: 'Queue empty' };
  }

  if (!nextItem.cloudVideoUrl) {
    console.error(`[Cloud Publisher] Item ${nextItem.id} is missing cloudVideoUrl! Skipping.`);
    nextItem.status = 'error_missing_url';
    fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { ok: false, error: 'Missing cloud URL' };
  }

  console.log(`[Cloud Publisher] Publishing next Whisprs video: "${nextItem.title || nextItem.id}"`);
  console.log(`[Cloud Publisher] Video Cloud URL: ${nextItem.cloudVideoUrl}`);

  const dispatched = [];
  let allSuccess = true;

  for (const ch of CHANNELS) {
    console.log(`[Cloud Publisher] Broadcasting to ${ch.channelName}...`);
    try {
      const res = await createBufferPost({
        channelId: ch.channelId,
        service: ch.service,
        text: nextItem.caption,
        title: nextItem.title,
        videoUrl: nextItem.cloudVideoUrl
      });

      const post = res.data?.createPost?.post;
      if (post && post.id) {
        console.log(`[Cloud Publisher] ✓ ${ch.channelName} SUCCESS (Post ID: ${post.id}, Status: ${post.status})`);
        dispatched.push({
          channel: ch.channelName,
          channelId: ch.channelId,
          postId: post.id,
          status: post.status
        });
      } else {
        const errMsg = res.data?.createPost?.message || JSON.stringify(res.errors || res);
        console.error(`[Cloud Publisher] ✗ ${ch.channelName} FAILED:`, errMsg);
        dispatched.push({
          channel: ch.channelName,
          channelId: ch.channelId,
          error: errMsg
        });
        allSuccess = false;
      }
    } catch (err) {
      console.error(`[Cloud Publisher] ✗ ${ch.channelName} EXCEPTION:`, err.message);
      dispatched.push({
        channel: ch.channelName,
        channelId: ch.channelId,
        error: err.message
      });
      allSuccess = false;
    }
  }

  nextItem.status = allSuccess ? 'published' : (dispatched.some(d => d.postId) ? 'partially_published' : 'failed');
  nextItem.publishedAt = new Date().toISOString();
  nextItem.dispatchedPosts = dispatched;
  data.updatedAt = new Date().toISOString();

  fs.writeFileSync(QUEUE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[Cloud Publisher] Run finished. Item status updated to: ${nextItem.status}`);

  return { ok: allSuccess, dispatched };
}

// If executed directly
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runDailyWhisprsPublish().then(res => {
    if (!res.ok && res.error) process.exit(1);
  }).catch(e => {
    console.error(e);
    process.exit(1);
  });
}
