// server.mjs - Whisprs Studio Host API Server for n8n, Zapier & External Orchestration
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { produceVideo } from './engine.mjs';
import { produceVideoV2 } from './produce_whisprs_v2.mjs';
import { produceFlowWhisprsReel } from './render_flow_whisprs.mjs';
import { produceFlowWhisprsVideo2 } from './render_flow_whisprs_video2.mjs';
import { produceFlowWhisprsVideo3 } from './render_flow_whisprs_video3.mjs';
import { produceFlowWhisprsVideo4 } from './render_flow_whisprs_video4.mjs';
import { produceFlowWhisprsVideo5 } from './render_flow_whisprs_video5.mjs';
import { produceFlowWhisprsQwenMaster } from './produce_flow_qwen06_master.mjs';
import { produceWhisprsV4Cloned } from './produce_whisprs_v4_cloned.mjs';
import { produceWhisprsFixedV5 } from './produce_whisprs_fixed_v5.mjs';
import { produceWhisprsSlow5Master } from './produce_whisprs_slow5_master.mjs';
import { 
  loadQueue, 
  saveQueue, 
  addToQueue, 
  checkBufferLimits, 
  dispatchNext, 
  CHANNELS 
} from './publish_queue_manager.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const VISUALS_V2_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'v2');
const SAMPLES_DIR = 'C:/Users/majji/OneDrive/Desktop/whisprs_voice_samples';
const MUSIC_DIR = 'C:/Users/majji/OneDrive/Desktop/music';
const PORT = process.env.PORT || 5055;

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// High-Speed Public Ingest Tunnel for Buffer (Cloudflare Edge with SSH fallback)
let publicBaseUrl = null;
const CLOUDFLARED_BIN = path.join(ROOT_DIR, 'bin', 'cloudflared.exe');

function initPublicTunnel() {
  if (fs.existsSync(CLOUDFLARED_BIN)) {
    try {
      console.log('[Tunnel] Launching high-speed Cloudflare Edge Tunnel...');
      const cf = spawn(CLOUDFLARED_BIN, ['tunnel', '--url', `http://127.0.0.1:${PORT}`]);
      const handleData = (data) => {
        const text = data.toString();
        const match = text.match(/https:\/\/[a-zA-Z0-9.-]+\.trycloudflare\.com/);
        if (match && !publicBaseUrl) {
          publicBaseUrl = match[0];
          console.log(`[Buffer Ingest Tunnel] Ultra-fast Cloudflare Edge ready: ${publicBaseUrl}`);
          setTimeout(() => {
            dispatchNext({ publicBaseUrl }).then(res => {
              if (res.dispatched) {
                console.log(`[Auto Dispatch on Tunnel Ready]:`, res.message);
              }
            }).catch(err => console.warn('[Auto Dispatch Error]:', err.message));
          }, 1500);
        }
      };
      cf.stdout.on('data', handleData);
      cf.stderr.on('data', handleData);
      cf.on('close', () => {
        console.log('[Tunnel] Cloudflare closed. Reconnecting in 5s...');
        publicBaseUrl = null;
        setTimeout(initPublicTunnel, 5000);
      });
      cf.on('error', (err) => {
        console.warn('[Tunnel] Cloudflare notice, falling back to SSH:', err.message);
        initSshTunnel();
      });
      return;
    } catch (e) {
      console.warn('[Tunnel] Cloudflare attempt failed, falling back to SSH:', e.message);
    }
  }
  initSshTunnel();
}

function initSshTunnel() {
  try {
    const ssh = spawn('ssh', [
      '-o', 'StrictHostKeyChecking=no',
      '-o', 'ServerAliveInterval=30',
      '-R', `80:127.0.0.1:${PORT}`,
      'nokey@localhost.run'
    ]);
    ssh.stdout.on('data', (data) => {
      const match = data.toString().match(/https:\/\/[a-zA-Z0-9.-]+\.lhr\.life/);
      if (match && !publicBaseUrl) {
        publicBaseUrl = match[0];
        console.log(`[Buffer Ingest Tunnel] Public stream ready (SSH): ${publicBaseUrl}`);
        setTimeout(() => {
          dispatchNext({ publicBaseUrl }).then(res => {
            if (res.dispatched) {
              console.log(`[Auto Dispatch on Tunnel Ready]:`, res.message);
            }
          }).catch(err => console.warn('[Auto Dispatch Error]:', err.message));
        }, 2000);
      }
    });
    ssh.on('close', () => {
      console.log('[Buffer Ingest Tunnel] SSH Closed. Reconnecting in 5s...');
      publicBaseUrl = null;
      setTimeout(initPublicTunnel, 5000);
    });
    ssh.on('error', (err) => {
      console.warn('[Buffer Ingest Tunnel] SSH notice:', err.message);
    });
  } catch (e) {
    console.warn('[Buffer Ingest Tunnel] SSH spawn skipped:', e.message);
  }
}
initPublicTunnel();

// Periodic queue check every 15 minutes to auto-fill Buffer when posts go live
setInterval(() => {
  if (publicBaseUrl) {
    dispatchNext({ publicBaseUrl }).then(res => {
      if (res.dispatched) {
        console.log(`[Periodic Auto Dispatch]:`, res.message);
      }
    }).catch(err => console.warn('[Periodic Dispatch Error]:', err.message));
  }
}, 15 * 60 * 1000);

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  // Healthcheck
  if (req.method === 'GET' && url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      studio: 'Whisprs Video Studio 2.0', 
      publicBaseUrl, 
      uptime_s: process.uptime() 
    }));
    return;
  }

  // ==========================================
  // Buffer Publishing Queue Endpoints
  // ==========================================

  // 1. Queue Status & Buffer Limits
  if (req.method === 'GET' && url.pathname === '/api/queue/status') {
    const queue = loadQueue();
    const limits = await checkBufferLimits();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      publicBaseUrl,
      pendingCount: queue.filter(i => i.status === 'pending').length,
      scheduledCount: queue.filter(i => i.status === 'scheduled').length,
      totalCount: queue.length,
      channels: CHANNELS,
      bufferLimits: limits,
      items: queue
    }, null, 2));
  }

  // 2. Trigger Queue Dispatch (Checks slots and pushes next video if available)
  if (req.method === 'POST' && url.pathname === '/api/queue/dispatch') {
    const result = await dispatchNext({ publicBaseUrl });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(result));
  }

  // 3. Sync Existing Output MP4 Files into Whisprs Queue
  if (req.method === 'POST' && url.pathname === '/api/queue/sync-output') {
    const existingFiles = fs.readdirSync(OUTPUT_DIR).filter(f => f.endsWith('.mp4'));
    const queue = loadQueue();
    let addedCount = 0;
    for (const file of existingFiles) {
      if (!queue.some(q => q.videoFilename === file)) {
        addToQueue({
          jobId: `file_${path.basename(file, '.mp4')}`,
          title: 'Whisprs Poetry',
          caption: 'Quiet reminders and late-night thoughts. 🖤✨\n\n#whisprs #poetry #quotes #deepthoughts #reels #shorts',
          videoFilename: file,
          engine: 'pre_rendered'
        });
        addedCount++;
      }
    }
    let dispatchRes = null;
    if (publicBaseUrl) {
      try {
        dispatchRes = await dispatchNext({ publicBaseUrl });
      } catch (e) {
        console.warn('[Sync Dispatch Notice]:', e.message);
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({
      status: 'ok',
      addedCount,
      totalInQueue: loadQueue().length,
      dispatch: dispatchRes
    }));
  }

  // 4. Manually Add Video to Queue
  if (req.method === 'POST' && url.pathname === '/api/queue/add') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        if (!payload.videoFilename) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: false, error: 'videoFilename is required' }));
        }
        const item = addToQueue(payload);
        let dispatchRes = null;
        if (publicBaseUrl) {
          dispatchRes = await dispatchNext({ publicBaseUrl });
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, item, dispatch: dispatchRes }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: e.message }));
      }
    });
    return;
  }

  // Image Generation Prompts Catalog Endpoint (for n8n & Studio)
  if (req.method === 'GET' && (url.pathname === '/prompts' || url.pathname === '/api/image-prompts')) {
    const promptsFile = path.join(ROOT_DIR, 'config', 'image_prompts.json');
    if (fs.existsSync(promptsFile)) {
      const prompts = JSON.parse(fs.readFileSync(promptsFile, 'utf-8'));
      const count = parseInt(url.searchParams.get('count') || '0', 10);
      const data = count > 0 ? prompts.slice(0, count) : prompts;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count: data.length, prompts: data }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Prompts catalog not found' }));
    }
    return;
  }

  // Generate V1 Endpoint (Preserved)
  if (req.method === 'POST' && url.pathname === '/generate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        console.log(`[Whisprs API] Received /generate (V1) request:`, payload);
        const result = await produceVideo(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          video_id: result.job_id,
          title: result.title,
          hook: result.hook,
          category: result.category,
          script: result.script,
          duration_seconds: result.duration_seconds,
          stream_url: `http://localhost:5055/stream/${result.job_id}.mp4`,
          files: result.artifacts
        }));
      } catch (err) {
        console.error('[Whisprs API] Video generation failed:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Generate V2 Endpoint (Preserved)
  if (req.method === 'POST' && url.pathname === '/generate-v2') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        console.log(`[Whisprs API] Received /generate-v2 request:`, payload);
        const result = await produceVideoV2(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          video_id: result.job_id,
          title: result.title,
          hook: result.hook,
          category: result.category,
          script: result.script,
          duration_seconds: result.duration_seconds,
          stream_url: `http://localhost:5055/stream/${result.job_id}.mp4`,
          files: result.artifacts
        }));
      } catch (err) {
        console.error('[Whisprs API] V2 generation failed:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Generate Flow & VoiceStudio Master Workflow Endpoint
  if (req.method === 'POST' && (url.pathname === '/generate-flow-whisprs' || url.pathname === '/generate-flow-qwen')) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        console.log(`[Whisprs API] Received ${url.pathname} request:`, payload);
        let result;
        if (payload.engine === 'voicestudio' && payload.video === 5) {
          result = await produceFlowWhisprsVideo5(payload);
        } else if (payload.engine === 'voicestudio' && payload.video === 4) {
          result = await produceFlowWhisprsVideo4(payload);
        } else if (payload.video === 2 || (payload.title && payload.title.includes('Longer'))) {
          result = await produceFlowWhisprsVideo2(payload);
        } else if (payload.version === 'v4') {
          result = await produceWhisprsV4Cloned(payload);
        } else if (payload.version === 'fixed_v5') {
          result = await produceWhisprsFixedV5(payload);
        } else {
          // Default Master Engine: Original Qwen 0.6B Cloned Voice, 5% Slower (atempo=0.95), Strictly ZERO Points
          result = await produceWhisprsSlow5Master(payload);
        }

        const videoFilename = result.job_id ? `${result.job_id}.mp4` : (result.artifacts?.video_mp4 ? path.basename(result.artifacts.video_mp4) : null);
        
        // Auto-enqueue the generated video for Buffer dispatch
        if (videoFilename) {
          addToQueue({
            jobId: result.job_id,
            title: result.title,
            caption: result.caption,
            videoFilename,
            hook: result.hook,
            script: result.script,
            hashtags: result.hashtags,
            engine: 'whisprs_master_qwen_slow5'
          });
          if (publicBaseUrl) {
            dispatchNext({ publicBaseUrl }).then(res => {
              if (res.dispatched) {
                console.log(`[Auto Dispatch Post-Render]:`, res.message);
              }
            }).catch(e => console.warn('[Auto Dispatch Error]:', e.message));
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          video_id: result.job_id,
          title: result.title,
          hook: result.hook,
          category: result.category,
          script: result.script,
          duration_seconds: result.duration_seconds,
          caption: result.caption,
          hashtags: result.hashtags,
          stream_url: `http://localhost:5055/stream/${result.job_id}.mp4`,
          files: result.artifacts
        }));
      } catch (err) {
        console.error('[Whisprs API] Flow & VoiceStudio generation failed:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Generate Flow & VoiceStudio Video 2 Master Workflow Endpoint
  if (req.method === 'POST' && url.pathname === '/generate-flow-whisprs-video2') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        console.log(`[Whisprs API] Received /generate-flow-whisprs-video2 request:`, payload);
        const result = await produceFlowWhisprsVideo2(payload);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          video_id: result.job_id,
          title: result.title,
          hook: result.hook,
          category: result.category,
          script: result.script,
          duration_seconds: result.duration_seconds,
          caption: result.caption,
          hashtags: result.hashtags,
          stream_url: `http://localhost:5055/stream/${result.job_id}.mp4`,
          files: result.artifacts
        }));
      } catch (err) {
        console.error('[Whisprs API] Video 2 generation failed:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Serve Web Showcase Dashboard
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    const mp4Files = fs.readdirSync(OUTPUT_DIR).filter(f => (f.startsWith('whisprs_cloned_slow5_') || f.startsWith('whisprs_fixed_v5_') || f.startsWith('whisprs_flow_') || f.startsWith('job_flow_') || f.startsWith('job_v2_') || f.startsWith('job_gemini_')) && f.endsWith('.mp4'));
    mp4Files.sort((a, b) => fs.statSync(path.join(OUTPUT_DIR, b)).mtimeMs - fs.statSync(path.join(OUTPUT_DIR, a)).mtimeMs);
    const latestMp4 = mp4Files[0] || 'whisprs_flow_video2_master.mp4';
    const latestThumb = latestMp4.replace('.mp4', '_thumb.jpg');

    const queue = loadQueue();
    const pendingCount = queue.filter(i => i.status === 'pending').length;
    const scheduledCount = queue.filter(i => i.status === 'scheduled').length;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Whisprs Studio V2 - Video & Audio Showcase</title>
  <style>
    body { background: #0d1117; color: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px; max-width: 800px; margin: 0 auto; }
    h1 { color: #58a6ff; font-size: 24px; margin-bottom: 5px; }
    p.subtitle { color: #8b949e; margin-top: 0; margin-bottom: 25px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 18px 22px; margin-bottom: 16px; }
    .card.highlight { border-color: #238636; background: #111e15; }
    .card.buffer { border-color: #1f6feb; background: #0c1829; }
    .title { font-size: 16px; font-weight: 600; color: #f0f6fc; margin-bottom: 4px; }
    .desc { font-size: 13px; color: #8b949e; margin-bottom: 12px; }
    audio { width: 100%; border-radius: 4px; outline: none; }
    a { color: #58a6ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .btn { display: inline-block; background: #238636; color: #fff; padding: 10px 16px; border-radius: 6px; font-weight: 600; text-decoration: none; margin-top: 10px; cursor: pointer; border: none; }
    .btn:hover { background: #2ea043; text-decoration: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-success { background: #238636; color: #fff; }
    .badge-info { background: #1f6feb; color: #fff; }
  </style>
</head>
<body>
  <h1>🎬 Whisprs Studio: Video Showcase & Buffer Auto-Publisher</h1>
  <p class="subtitle">Qwen 0.6 Cloned Voice, Flow Visuals, & Automated Buffer Scheduling (8 AM & 8 PM Casablanca).</p>

  <div class="card buffer">
    <div class="title">🚀 Buffer Auto-Publisher Status</div>
    <div class="desc">
      Connected Channels: <b>YouTube Shorts (Vesper's)</b> & <b>Facebook Reels (Vesper)</b><br>
      Schedule Cadence: <b>2 videos per day (8:00 AM & 8:00 PM Casablanca)</b><br>
      Tunnel: <code>${publicBaseUrl || 'Initializing tunnel...'}</code><br>
      Queue: <span class="badge badge-info">${pendingCount} Pending</span> | <span class="badge badge-success">${scheduledCount} Scheduled</span>
    </div>
    <button class="btn" onclick="fetch('/api/queue/dispatch', {method:'POST'}).then(r=>r.json()).then(d=>alert(d.message || JSON.stringify(d)))">⚡ Dispatch Next Video Now</button>
    <a href="/api/queue/status" target="_blank" class="btn" style="background: #388bfd; margin-left: 10px;">📋 View Full Queue JSON</a>
  </div>

  <div style="margin-bottom: 20px;">
    <a href="/voicestudio" class="btn" style="background: #1f6feb;">🎙️ Open Interactive VoiceStudio</a>
    <a href="/prompts" target="_blank" class="btn" style="background: #8957e5; margin-left: 10px;">🎨 Image Prompts Catalog</a>
  </div>

  <div class="card highlight" style="text-align: center; margin-bottom: 25px;">
    <div class="title" style="font-size: 18px; margin-bottom: 8px;">✨ Latest Produced Video: Master Slow 5%</div>
    <div class="desc" style="margin-bottom: 15px;">Full HD 1080x1920 (9:16 Vertical) | Cloned Voice (-5% speed) | Denoised Piano | Whisper Alignment Subtitles</div>
    <video controls style="max-width: 320px; width: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" poster="/stream/${latestThumb}">
      <source src="/stream/${latestMp4}" type="video/mp4">
      Your browser does not support the video tag.
    </video>
    <div style="margin-top: 12px;">
      <a style="font-size: 14px; font-weight: 600;" href="/stream/${latestMp4}" target="_blank">▶️ Open Fullscreen Video Stream</a>
    </div>
  </div>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // VoiceStudio Dedicated Voice Audition & Testing Interface
  if (req.method === 'GET' && url.pathname === '/voicestudio') {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Whisprs VoiceStudio</title>
</head>
<body style="background: #0d1117; color: #c9d1d9; font-family: sans-serif; padding: 20px;">
  <h2>VoiceStudio Interface</h2>
  <a href="/" style="color: #58a6ff;">Return to Dashboard</a>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
    return;
  }

  // Audio & Music files
  if (url.pathname.startsWith('/audio/')) {
    const filename = url.pathname.replace('/audio/', '');
    serveFile(path.join(SAMPLES_DIR, filename), res, req);
    return;
  }
  if (url.pathname.startsWith('/music/')) {
    const filename = url.pathname.replace('/music/', '');
    serveFile(path.join(MUSIC_DIR, filename), res, req);
    return;
  }
  if (url.pathname.startsWith('/image/')) {
    const filename = url.pathname.replace('/image/', '');
    serveFile(path.join(VISUALS_V2_DIR, filename), res, req);
    return;
  }

  // Stream MP4 File (for Browser, n8n, Buffer)
  if ((req.method === 'GET' || req.method === 'HEAD') && (url.pathname.startsWith('/stream/') || url.pathname.startsWith('/video/'))) {
    const filename = path.basename(url.pathname);
    const filePath = path.join(OUTPUT_DIR, filename);
    serveFile(filePath, res, req);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

function serveFile(filePath, res, req) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'File not found' }));
    return;
  }

  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = ext === '.mp4' ? 'video/mp4' :
                      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                      ext === '.png' ? 'image/png' :
                      ext === '.wav' ? 'audio/wav' :
                      ext === '.mp3' ? 'audio/mpeg' : 'application/octet-stream';

  const range = req ? req.headers.range : null;
  if (req && req.method === 'HEAD') {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    });
    res.end();
    return;
  }
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes'
    });
    fs.createReadStream(filePath).pipe(res);
  }
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Whisprs Studio] Host HTTP Server listening on http://0.0.0.0:${PORT}`);
  console.log(`[Whisprs Studio] Accessible from Docker n8n at http://host.docker.internal:${PORT}`);
});
