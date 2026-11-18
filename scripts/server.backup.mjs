// server.mjs - Whisprs Studio Host API Server for n8n, Zapier & External Orchestration
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { produceVideo } from './engine.mjs';
import { produceVideoV2 } from './produce_whisprs_v2.mjs';
import { produceFlowWhisprsReel } from './render_flow_whisprs.mjs';
import { produceFlowWhisprsVideo2 } from './render_flow_whisprs_video2.mjs';
import { produceFlowWhisprsVideo3 } from './render_flow_whisprs_video3.mjs';
import { produceFlowWhisprsVideo4 } from './render_flow_whisprs_video4.mjs';
import { produceFlowWhisprsVideo5 } from './render_flow_whisprs_video5.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const VISUALS_V2_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'v2');
const SAMPLES_DIR = 'C:/Users/majji/OneDrive/Desktop/whisprs_voice_samples';
const MUSIC_DIR = 'C:/Users/majji/OneDrive/Desktop/music';
const PORT = process.env.PORT || 5055;

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
    res.end(JSON.stringify({ status: 'ok', studio: 'Whisprs Video Studio 2.0', uptime_s: process.uptime() }));
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
          caption: result.caption,
          hashtags: result.hashtags,
          stream_url: `http://localhost:5055/stream/${result.job_id}.mp4`,
          files: result.artifacts
        }));
      } catch (err) {
        console.error('[Whisprs API] Generation failed:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Generate V2 Endpoint (New Authentic Character-Driven Engine)
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
          script: result.script,
          duration_seconds: result.duration_seconds,
          caption: result.caption,
          hashtags: result.hashtags,
          stream_url: `http://localhost:5055/stream/${result.job_id}.mp4`,
          files: result.artifacts
        }));
      } catch (err) {
        console.error('[Whisprs API] Generation V2 failed:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Generate Flow & VoiceStudio Master Workflow Endpoint
  if (req.method === 'POST' && url.pathname === '/generate-flow-whisprs') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = body ? JSON.parse(body) : {};
        console.log(`[Whisprs API] Received /generate-flow-whisprs request:`, payload);
        let result;
        if (payload.video === 5 || (!payload.video && (!payload.title || payload.title.includes('Weight')))) {
          result = await produceFlowWhisprsVideo5(payload);
        } else if (payload.video === 4 || (payload.title && payload.title.includes('Behind'))) {
          result = await produceFlowWhisprsVideo4(payload);
        } else if (payload.video === 2 || (payload.title && payload.title.includes('Longer'))) {
          result = await produceFlowWhisprsVideo2(payload);
        } else if (payload.video === 1 || (payload.title && payload.title.includes('Quiet'))) {
          result = await produceFlowWhisprsReel(payload);
        } else {
          result = await produceFlowWhisprsVideo3(payload);
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
    const mp4Files = fs.readdirSync(OUTPUT_DIR).filter(f => (f.startsWith('whisprs_flow_') || f.startsWith('job_v2_') || f.startsWith('job_gemini_')) && f.endsWith('.mp4'));
    mp4Files.sort((a, b) => fs.statSync(path.join(OUTPUT_DIR, b)).mtimeMs - fs.statSync(path.join(OUTPUT_DIR, a)).mtimeMs);
    const latestMp4 = mp4Files[0] || 'whisprs_flow_video2_master.mp4';
    const latestThumb = latestMp4.replace('.mp4', '_thumb.jpg');

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
    .title { font-size: 16px; font-weight: 600; color: #f0f6fc; margin-bottom: 4px; }
    .desc { font-size: 13px; color: #8b949e; margin-bottom: 12px; }
    audio { width: 100%; border-radius: 4px; outline: none; }
    a { color: #58a6ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .btn { display: inline-block; background: #238636; color: #fff; padding: 10px 16px; border-radius: 6px; font-weight: 600; text-decoration: none; margin-top: 10px; }
    .btn:hover { background: #2ea043; text-decoration: none; }
  </style>
</head>
<body>
  <h1>🎬 Whisprs Studio V2: Video & Audio Showcase</h1>
  <p class="subtitle">100% Authentic Voice, Clean Denoised Piano, Alive Motion & Dynamic Subtitles.</p>

  <div style="margin-bottom: 20px;">
    <a href="/voicestudio" class="btn" style="background: #1f6feb;">🎙️ Open Interactive VoiceStudio (Test & Pick Voices)</a>
    <a href="/prompts" target="_blank" class="btn" style="background: #8957e5; margin-left: 10px;">🎨 Image Prompts Catalog (20 Scenes JSON)</a>
  </div>

  <div class="card highlight" style="text-align: center; margin-bottom: 25px;">
    <div class="title" style="font-size: 18px; margin-bottom: 8px;">✨ Latest Produced Video: Cloned Voice V2</div>
    <div class="desc" style="margin-bottom: 15px;">Full HD 1080x1920 (9:16 Vertical) | Cloned Narrator Voice | Denoised Piano | Whisper Alignment Subtitles</div>
    <video controls style="max-width: 320px; width: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" poster="/stream/${latestThumb}">
      <source src="/stream/${latestMp4}" type="video/mp4">
      Your browser does not support the video tag.
    </video>
    <div style="margin-top: 12px;">
      <a style="font-size: 14px; font-weight: 600;" href="/stream/${latestMp4}" target="_blank">▶️ Open Fullscreen Video Stream</a>
    </div>
  </div>

  <div class="card">
    <div class="title">Original Facebook Reel Vocal (Isolated Dry)</div>
    <audio controls src="/audio/facebook_reel_vocals_isolated.wav"></audio>
  </div>

  <div class="card">
    <div class="title">Clean Piano Track (Denoised & Filtered)</div>
    <audio controls src="/music/Breathe_and_Allow_Things_to_Pass_denoised.wav"></audio>
  </div>
</body>
</html>`;
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // VoiceStudio Dedicated Voice Audition & Testing Interface
  if (req.method === 'GET' && url.pathname === '/voicestudio') {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VoiceStudio - Voice Audition & Selection</title>
  <style>
    body { background: #0b0f19; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 30px; max-width: 860px; margin: 0 auto; line-height: 1.5; }
    h1 { color: #60a5fa; font-size: 26px; margin-bottom: 4px; display: flex; align-items: center; gap: 10px; }
    p.subtitle { color: #94a3b8; margin-top: 0; margin-bottom: 25px; }
    .badge { background: #1e293b; color: #38bdf8; font-size: 12px; font-weight: 600; padding: 3px 8px; border-radius: 4px; border: 1px solid #334155; }
    .grid { display: grid; grid-template-columns: 1fr; gap: 14px; margin-bottom: 25px; }
    @media(min-width: 640px) { .grid { grid-template-columns: 1fr 1fr; } }
    .card { background: #131b2e; border: 1px solid #1e293b; border-radius: 10px; padding: 16px 20px; transition: border-color 0.2s, transform 0.2s; }
    .card:hover { border-color: #38bdf8; }
    .card.highlight { border-color: #10b981; background: #0c201d; }
    .card.purple { border-color: #8b5cf6; background: #17112c; }
    .card-title { font-size: 15px; font-weight: 700; color: #f8fafc; margin-bottom: 3px; display: flex; justify-content: space-between; align-items: center; }
    .card-desc { font-size: 12px; color: #94a3b8; margin-bottom: 12px; min-height: 32px; }
    audio { width: 100%; border-radius: 6px; outline: none; margin-top: 4px; }
    .external-box { background: #182238; border: 1px dashed #3b82f6; border-radius: 8px; padding: 16px; margin-bottom: 25px; }
    a { color: #38bdf8; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    .btn-choose { display: inline-block; background: #2563eb; color: #fff; font-size: 12px; font-weight: 600; padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; margin-top: 8px; text-decoration: none; }
    .btn-choose:hover { background: #1d4ed8; }
    .btn-chosen { background: #059669; cursor: default; }
  </style>
</head>
<body>
  <h1>🎙️ VoiceStudio Web: Audition & Pick Voices</h1>
  <p class="subtitle">Listen to each voice below, compare against the original reel vocal, and pick the exact one for Whisprs.</p>

  <div class="external-box">
    <div style="font-size: 14px; font-weight: 700; color: #93c5fd; margin-bottom: 6px;">🔗 VoiceStudio Official Links & Desktop App</div>
    <div style="font-size: 13px; color: #cbd5e1;">
      • <strong>GitHub Repository:</strong> <a href="https://github.com/debpalash/voicestudio" target="_blank">https://github.com/debpalash/voicestudio</a><br>
      • <strong>Official Website:</strong> <a href="https://voicestudio.sh" target="_blank">https://voicestudio.sh</a><br>
      • <strong>Installed Desktop App:</strong> Installed on your machine at <code>C:\\Users\\majji\\AppData\\Local\\Programs\\VoiceStudio\\VoiceStudio.exe</code>
    </div>
  </div>

  <div class="grid">
    <!-- Card 1: Original Vocals -->
    <div class="card highlight">
      <div class="card-title">
        <span>1. Original Reel Vocals (Benchmark)</span>
        <span class="badge" style="color: #34d399; border-color: #059669;">Original</span>
      </div>
      <div class="card-desc">The authentic isolated dry human vocals extracted from the Facebook Reel.</div>
      <audio controls src="/audio/facebook_reel_vocals_isolated.wav"></audio>
    </div>

    <!-- Card 2: Cloned Narrator (New Saying) -->
    <div class="card purple">
      <div class="card-title">
        <span>2. Cloned Original (F5-TTS)</span>
        <span class="badge" style="color: #c084fc; border-color: #7c3aed;">F5-TTS Diffusion</span>
      </div>
      <div class="card-desc">Zero-shot diffusion cloned from original reel voice speaking the new comforting lyrics.</div>
      <audio controls src="/audio/cloned_original_narrator_new_saying.wav"></audio>
    </div>

    <!-- Card 2B: Qwen3-TTS Clone -->
    <div class="card" style="border-color: #f59e0b; background: #20170a;">
      <div class="card-title">
        <span>2B. Qwen3-TTS Cloned Voice</span>
        <span class="badge" style="color: #fbbf24; border-color: #b45309;">Qwen3-TTS Base</span>
      </div>
      <div class="card-desc">Alibaba Qwen3-TTS zero-shot voice clone conditioned on original reel voice.</div>
      <audio controls src="/audio/qwen3_cloned_original_voice.wav"></audio>
    </div>

    <!-- Card 3: Kokoro Adam -->
    <div class="card">
      <div class="card-title">
        <span>3. Kokoro (am_adam)</span>
        <span class="badge">Kokoro Neural</span>
      </div>
      <div class="card-desc">Deep, calm, warm whisper storytelling voice (intimate and comforting).</div>
      <audio controls src="/audio/kokoro_am_adam_whisprs.wav"></audio>
    </div>

    <!-- Card 4: Kokoro Michael -->
    <div class="card">
      <div class="card-title">
        <span>4. Kokoro (am_michael)</span>
        <span class="badge">Kokoro Neural</span>
      </div>
      <div class="card-desc">Smooth, gentle late-night narrator tone with clear inflection.</div>
      <audio controls src="/audio/kokoro_am_michael_whisprs.wav"></audio>
    </div>

    <!-- Card 5: Edge-TTS Christopher -->
    <div class="card">
      <div class="card-title">
        <span>5. Edge-TTS Christopher</span>
        <span class="badge">Edge-TTS</span>
      </div>
      <div class="card-desc">Deep dramatic resonant male narrator tone.</div>
      <audio controls src="/audio/sample_christopher_deep.mp3"></audio>
    </div>

    <!-- Card 6: Edge-TTS Brian -->
    <div class="card">
      <div class="card-title">
        <span>6. Edge-TTS Brian</span>
        <span class="badge">Edge-TTS</span>
      </div>
      <div class="card-desc">Warm, approachable natural human cadence and clear delivery.</div>
      <audio controls src="/audio/sample_brian_warm.mp3"></audio>
    </div>

    <!-- Card 7: Edge-TTS Andrew -->
    <div class="card">
      <div class="card-title">
        <span>7. Edge-TTS Andrew</span>
        <span class="badge">Edge-TTS</span>
      </div>
      <div class="card-desc">Calm, introspective, modern conversational tone.</div>
      <audio controls src="/audio/sample_andrew_calm.mp3"></audio>
    </div>

    <!-- Card 8: Edge-TTS Ryan -->
    <div class="card">
      <div class="card-title">
        <span>8. Edge-TTS Ryan (British)</span>
        <span class="badge">Edge-TTS</span>
      </div>
      <div class="card-desc">Sophisticated poetic cadence with mild British accent.</div>
      <audio controls src="/audio/sample_ryan_poetic.mp3"></audio>
    </div>
  </div>

  <div class="card" style="margin-top: 15px; border-color: #3b82f6;">
    <div class="card-title" style="font-size: 16px; color: #93c5fd; margin-bottom: 8px;">
      🎧 Direct Side-by-Side Comparison Audio
    </div>
    <div class="card-desc">First half: Original Reel Voice. Second half: Kokoro Adam synthesis.</div>
    <audio controls src="/audio/ORIGINAL_vs_KOKORO_ADAM_comparison.wav"></audio>
  </div>

  <div style="margin-top: 25px; text-align: center;">
    <a href="/" style="font-size: 14px;">⬅️ Return to Video Showcase Dashboard</a>
  </div>
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

  // Stream MP4 File (for Browser, n8n, Zapier)
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
});
