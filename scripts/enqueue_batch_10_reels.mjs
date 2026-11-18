// scripts/enqueue_batch_10_reels.mjs - Enqueue 10 Produced Whisprs Reels for 8AM & 8PM Daily Publishing
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REELS } from './produce_10_whisprs_reels.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const QUEUE_FILE = path.join(ROOT_DIR, 'jobs', 'whisprs_cloud_publish_queue.json');
const LOCAL_QUEUE_FILE = path.join(ROOT_DIR, 'jobs', 'whisprs_publish_queue.json');

export function enqueue10Reels() {
  console.log(`[Queue Builder] Enqueuing 10 Whisprs Reels for 2x Daily Publishing (8AM & 8PM)...`);

  // Target schedule starts tomorrow: Nov 19, 2026 at 08:00 UTC
  // 2 slots per day: 08:00 UTC (8AM) and 20:00 UTC (8PM)
  const scheduleSlots = [
    "2026-11-19T08:00:00.000Z",
    "2026-11-19T20:00:00.000Z",
    "2026-11-20T08:00:00.000Z",
    "2026-11-20T20:00:00.000Z",
    "2026-11-21T08:00:00.000Z",
    "2026-11-21T20:00:00.000Z",
    "2026-11-22T08:00:00.000Z",
    "2026-11-22T20:00:00.000Z",
    "2026-11-23T08:00:00.000Z",
    "2026-11-23T20:00:00.000Z"
  ];

  let existingQueue = { items: [], updatedAt: new Date().toISOString() };
  if (fs.existsSync(QUEUE_FILE)) {
    try {
      existingQueue = JSON.parse(fs.readFileSync(QUEUE_FILE, 'utf-8'));
    } catch (e) {}
  }

  // Filter out any older pending items from previous test runs if any
  const keptItems = (existingQueue.items || []).filter(item => item.status === 'published');

  const newItems = REELS.map((reel, idx) => {
    const filename = `${reel.id}.mp4`;
    const fullScript = reel.phrases.join(' - ');
    const hook = reel.hook;
    const slot = scheduleSlots[idx];

    // Format poetic multi-line caption for YouTube Shorts & Facebook Reels
    const quoteBody = reel.phrases.slice(1).join(' ') + ' 🖤✨';
    const caption = `${hook}\n\n"${quoteBody}"\n\n#whisprs #poetry #quotes #deepthoughts #healing #solitude #reels #shorts`;

    return {
      id: `whisprs_${reel.id}_${Date.now()}`,
      jobId: reel.id,
      title: `${reel.title} | Whisprs`,
      caption,
      hook,
      script: fullScript,
      hashtags: "#whisprs #poetry #quotes #deepthoughts #reels #shorts",
      videoFilename: filename,
      cloudVideoUrl: `https://github.com/Pelele-hub/whisprs-video-studio/releases/download/whisprs-stock-videos/${filename}`,
      engine: "qwen_0.6b_cloned_whisper_slow5",
      status: "pending",
      scheduledSlot: slot,
      createdAt: new Date().toISOString()
    };
  });

  const finalQueue = {
    items: [...keptItems, ...newItems],
    updatedAt: new Date().toISOString()
  };

  fs.writeFileSync(QUEUE_FILE, JSON.stringify(finalQueue, null, 2), 'utf-8');
  fs.writeFileSync(LOCAL_QUEUE_FILE, JSON.stringify(finalQueue, null, 2), 'utf-8');
  console.log(`[Queue Builder] Successfully queued ${newItems.length} videos into ${QUEUE_FILE}!`);
  newItems.forEach((item, idx) => {
    console.log(` ${idx+1}. [${item.scheduledSlot}] -> ${item.title} (${item.videoFilename})`);
  });

  return newItems;
}

if (process.argv[1] && process.argv[1].endsWith('enqueue_batch_10_reels.mjs')) {
  enqueue10Reels();
}
