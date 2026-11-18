// scripts/cloud_stock_uploader.mjs - Upload local video stock to Whisprs GitHub Release Vault
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const QUEUE_DIR = path.join(ROOT_DIR, 'jobs');
const LOCAL_QUEUE_FILE = path.join(QUEUE_DIR, 'whisprs_publish_queue.json');
const CLOUD_QUEUE_FILE = path.join(QUEUE_DIR, 'whisprs_cloud_publish_queue.json');

// Auto-load .env
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').trim().replace(/\r$/, '');
    }
  }
}

const GITHUB_REPO = process.env.GITHUB_REPOSITORY || 'Pelele-hub/whisprs-video-studio';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const RELEASE_TAG = 'whisprs-stock-videos';

async function ghFetch(url, options = {}) {
  const headers = {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'WhisprsVideoStudio-Uploader',
    ...options.headers
  };
  return fetch(url, { ...options, headers });
}

// Get or create the GitHub Release for stock videos
async function getOrCreateRelease(repo) {
  console.log(`[GitHub Stock] Checking release '${RELEASE_TAG}' in ${repo}...`);
  const getRes = await ghFetch(`https://api.github.com/repos/${repo}/releases/tags/${RELEASE_TAG}`);
  if (getRes.status === 200) {
    const data = await getRes.json();
    console.log(`[GitHub Stock] Found existing release ID: ${data.id}`);
    return data;
  }

  console.log(`[GitHub Stock] Release not found, creating release '${RELEASE_TAG}'...`);
  const createRes = await ghFetch(`https://api.github.com/repos/${repo}/releases`, {
    method: 'POST',
    body: JSON.stringify({
      tag_name: RELEASE_TAG,
      name: 'Whisprs Video Stock Vault',
      body: 'Automated 24/7 video CDN vault for Whisprs daily scheduled publishing.',
      draft: false,
      prerelease: false
    })
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Failed to create release: ${err}`);
  }

  const newRelease = await createRes.json();
  console.log(`[GitHub Stock] Created release ID: ${newRelease.id}`);
  return newRelease;
}

// Upload a single MP4 asset to GitHub Release
async function uploadAssetToRelease(repo, releaseId, uploadUrlTemplate, filePath, filename) {
  const uploadUrl = uploadUrlTemplate.replace(/\{.*\}/, `?name=${encodeURIComponent(filename)}`);
  const stats = fs.statSync(filePath);
  const stream = fs.createReadStream(filePath);

  console.log(`[GitHub Stock] Uploading ${filename} (${(stats.size / 1024 / 1024).toFixed(1)} MB)...`);

  const res = await ghFetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': stats.size.toString()
    },
    body: stream,
    duplex: 'half'
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Asset upload failed (${res.status}): ${err}`);
  }

  const asset = await res.json();
  console.log(`[GitHub Stock] Asset uploaded successfully: ${asset.browser_download_url}`);
  return asset.browser_download_url;
}

// Sync local queued items to cloud stock vault
export async function syncLocalStockToCloud() {
  const repo = GITHUB_REPO;
  console.log(`[GitHub Stock] Syncing local Whisprs stock to repository: ${repo}...`);

  const release = await getOrCreateRelease(repo);
  const existingAssets = release.assets || [];

  // Load existing cloud queue or initialize
  let cloudQueue = { items: [], updatedAt: new Date().toISOString() };
  if (fs.existsSync(CLOUD_QUEUE_FILE)) {
    try {
      cloudQueue = JSON.parse(fs.readFileSync(CLOUD_QUEUE_FILE, 'utf-8'));
    } catch (e) {}
  }

  // Load local items
  let localItems = [];
  if (fs.existsSync(LOCAL_QUEUE_FILE)) {
    try {
      localItems = JSON.parse(fs.readFileSync(LOCAL_QUEUE_FILE, 'utf-8')).items || [];
    } catch (e) {}
  }

  console.log(`[GitHub Stock] Found ${localItems.length} videos in local queue.`);

  for (const item of localItems) {
    const filename = item.videoFilename;
    const filePath = path.join(OUTPUT_DIR, filename);

    if (!fs.existsSync(filePath)) {
      console.warn(`[GitHub Stock] File not found on disk: ${filePath}, skipping.`);
      continue;
    }

    // Check if item is already in cloud queue
    let cloudItem = cloudQueue.items.find(c => c.videoFilename === filename);

    // Check if asset is already uploaded in GitHub Release
    const existingAsset = existingAssets.find(a => a.name === filename);
    let downloadUrl = existingAsset ? existingAsset.browser_download_url : null;

    if (!downloadUrl) {
      try {
        downloadUrl = await uploadAssetToRelease(repo, release.id, release.upload_url, filePath, filename);
      } catch (err) {
        console.error(`[GitHub Stock] Error uploading ${filename}:`, err.message);
        continue;
      }
    } else {
      console.log(`[GitHub Stock] Asset ${filename} already exists in release: ${downloadUrl}`);
    }

    if (!cloudItem) {
      cloudQueue.items.push({
        id: item.id || `cloud_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        jobId: item.jobId,
        title: item.title,
        caption: item.caption,
        hook: item.hook,
        script: item.script,
        hashtags: item.hashtags,
        videoFilename: filename,
        cloudVideoUrl: downloadUrl,
        engine: item.engine,
        status: 'pending',
        createdAt: item.createdAt || new Date().toISOString(),
        publishedAt: null
      });
    } else {
      cloudItem.cloudVideoUrl = downloadUrl;
    }
  }

  cloudQueue.updatedAt = new Date().toISOString();
  fs.writeFileSync(CLOUD_QUEUE_FILE, JSON.stringify(cloudQueue, null, 2), 'utf-8');
  console.log(`[GitHub Stock] Cloud queue updated with ${cloudQueue.items.length} items (${cloudQueue.items.filter(i => i.status === 'pending').length} pending).`);
}

// CLI entry point
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  syncLocalStockToCloud().catch(err => {
    console.error('[GitHub Stock Error]:', err.message);
    process.exit(1);
  });
}
