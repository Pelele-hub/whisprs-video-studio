import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = 5055;
const SAMPLES_DIR = 'C:/Users/majji/OneDrive/Desktop/whisprs_voice_samples';
const MUSIC_DIR = 'C:/Users/majji/OneDrive/Desktop/music';
const VISUALS_V2_DIR = 'C:/Users/majji/whisprs_video_studio/assets/visuals/v2';
const OUTPUT_DIR = 'C:/Users/majji/whisprs_video_studio/output';

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url);

  if (url === '/' || url === '/index.html') {
    const files = fs.existsSync(SAMPLES_DIR) ? fs.readdirSync(SAMPLES_DIR) : [];
    const musicFiles = fs.existsSync(MUSIC_DIR) ? fs.readdirSync(MUSIC_DIR) : [];

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Whisprs Studio V2 - Voice Comparison Player</title>
  <style>
    body {
      background: #0d1117;
      color: #c9d1d9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 30px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 { color: #58a6ff; font-size: 24px; margin-bottom: 5px; }
    p.subtitle { color: #8b949e; margin-top: 0; margin-bottom: 25px; }
    .card {
      background: #161b22;
      border: 1px solid #30363d;
      border-radius: 8px;
      padding: 18px 22px;
      margin-bottom: 16px;
    }
    .card.highlight {
      border-color: #238636;
      background: #111e15;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      margin-left: 8px;
    }
    .badge-star { background: #238636; color: #fff; }
    .badge-orig { background: #1f6feb; color: #fff; }
    .title { font-size: 16px; font-weight: 600; color: #f0f6fc; margin-bottom: 4px; }
    .desc { font-size: 13px; color: #8b949e; margin-bottom: 12px; }
    audio { width: 100%; border-radius: 4px; outline: none; }
    .direct-link {
      display: inline-block;
      margin-top: 8px;
      font-size: 12px;
      color: #58a6ff;
      text-decoration: none;
    }
    .direct-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🎬 Whisprs Studio V2: Video & Audio Showcase</h1>
  <p class="subtitle">100% Authentic Voice, Clean Denoised Piano, 5 Character Scenes & Alive Motion.</p>

  <div class="card highlight" style="text-align: center; background: #0f1c13; border-color: #238636; margin-bottom: 25px;">
    <div class="title" style="font-size: 18px; margin-bottom: 8px;">✨ Produced Pilot V2: "You're Not Out of Time"</div>
    <div class="desc" style="margin-bottom: 15px;">Full HD 1080x1920 (9:16 Vertical) | Original Narrator Voice | Denoised Piano | Alive Subpixel Drift</div>
    <video controls style="max-width: 320px; width: 100%; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" poster="/video/job_v2_1793026447653_thumb.jpg">
      <source src="/video/job_v2_1793026447653.mp4" type="video/mp4">
      Your browser does not support the video tag.
    </video>
    <div style="margin-top: 12px;">
      <a class="direct-link" style="font-size: 14px; font-weight: 600;" href="/video/job_v2_1793026447653.mp4" target="_blank">▶️ Open Fullscreen Video Stream</a>
    </div>
  </div>

  <div class="card highlight">
    <div class="title">1. Side-by-Side Comparison <span class="badge badge-star">Must Listen</span></div>
    <div class="desc">First 6s: Original Reel Voice &nbsp;|&nbsp; Next 6s: Kokoro Adam AI Model (Same Sentence)</div>
    <audio controls src="/audio/ORIGINAL_vs_KOKORO_ADAM_comparison.wav"></audio>
    <div><a class="direct-link" href="/audio/ORIGINAL_vs_KOKORO_ADAM_comparison.wav" target="_blank">🔗 Direct Audio Stream Link</a></div>
  </div>

  <div class="card">
    <div class="title">2. Full Poetry Script: Kokoro Adam <span class="badge badge-star">Recommended</span></div>
    <div class="desc">Deep, calm, intimate reassuring narration of the full quote with soft whisper cadence.</div>
    <audio controls src="/audio/kokoro_am_adam_whisprs.wav"></audio>
    <div><a class="direct-link" href="/audio/kokoro_am_adam_whisprs.wav" target="_blank">🔗 Direct Audio Stream Link</a></div>
  </div>

  <div class="card">
    <div class="title">3. Original Facebook Reel Vocal <span class="badge badge-orig">Isolated Dry Vocal</span></div>
    <div class="desc">Raw narrator voice isolated from the reel using Demucs (no music).</div>
    <audio controls src="/audio/facebook_reel_vocals_isolated.wav"></audio>
    <div><a class="direct-link" href="/audio/facebook_reel_vocals_isolated.wav" target="_blank">🔗 Direct Audio Stream Link</a></div>
  </div>

  <div class="card">
    <div class="title">4. Kokoro Michael (Deep Cinematic American)</div>
    <div class="desc">Alternative grounded, masculine storytelling tone.</div>
    <audio controls src="/audio/kokoro_am_michael_whisprs.wav"></audio>
    <div><a class="direct-link" href="/audio/kokoro_am_michael_whisprs.wav" target="_blank">🔗 Direct Audio Stream Link</a></div>
  </div>

  <div class="card">
    <div class="title">5. Kokoro George (Warm British Narrative)</div>
    <div class="desc">Alternative warm, contemplative British cadence.</div>
    <audio controls src="/audio/kokoro_bm_george_whisprs.wav"></audio>
    <div><a class="direct-link" href="/audio/kokoro_bm_george_whisprs.wav" target="_blank">🔗 Direct Audio Stream Link</a></div>
  </div>

  <div class="card highlight">
    <div class="title">6. Clean Piano Track (Denoised & Filtered) <span class="badge badge-star">New Clean Master</span></div>
    <div class="desc">The pure backing soundtrack extracted from the reel with FFT noise reduction and zero speech residue.</div>
    <audio controls src="/music/Breathe_and_Allow_Things_to_Pass_denoised.wav"></audio>
    <div><a class="direct-link" href="/music/Breathe_and_Allow_Things_to_Pass_denoised.wav" target="_blank">🔗 Direct Audio Stream Link</a></div>
  </div>

  <div class="card">
    <div class="title">7. Clean Piano Track (Raw Separation)</div>
    <div class="desc">The raw Demucs separation before spectral denoising.</div>
    <audio controls src="/music/Breathe_and_Allow_Things_to_Pass_clean.wav"></audio>
    <div><a class="direct-link" href="/music/Breathe_and_Allow_Things_to_Pass_clean.wav" target="_blank">🔗 Direct Audio Stream Link</a></div>
  </div>
  <h2 style="color: #58a6ff; font-size: 20px; margin-top: 35px; margin-bottom: 15px;">🎨 Step 3: Character-Centric Visuals (1080x1920)</h2>
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 30px;">
    <div class="card" style="padding: 12px; text-align: center;">
      <div class="title" style="font-size: 14px;">Scene 1: Girl Window Zoom</div>
      <div class="desc" style="font-size: 11px;">"Just because you took longer than others..."</div>
      <img src="/image/scene_1_girl_zoom.jpg" style="width: 100%; border-radius: 6px; aspect-ratio: 9/16; object-fit: cover; margin-top: 8px;">
    </div>
    <div class="card" style="padding: 12px; text-align: center;">
      <div class="title" style="font-size: 14px;">Scene 2: Guy by "IGNORE" Door</div>
      <div class="desc" style="font-size: 11px;">"Some paths are meant to be taken slowly."</div>
      <img src="/image/scene_2_guy_door_ignore.jpg" style="width: 100%; border-radius: 6px; aspect-ratio: 9/16; object-fit: cover; margin-top: 8px;">
    </div>
    <div class="card" style="padding: 12px; text-align: center;">
      <div class="title" style="font-size: 14px;">Scene 3: Old Artisan by Store</div>
      <div class="desc" style="font-size: 11px;">"Some lessons take longer to understand."</div>
      <img src="/image/scene_3_old_man_store.jpg" style="width: 100%; border-radius: 6px; aspect-ratio: 9/16; object-fit: cover; margin-top: 8px;">
    </div>
    <div class="card" style="padding: 12px; text-align: center;">
      <div class="title" style="font-size: 14px;">Scene 4: Hooded Solitary Curb</div>
      <div class="desc" style="font-size: 11px;">"You're still growing even when it doesn't show."</div>
      <img src="/image/scene_4_hooded_curb.jpg" style="width: 100%; border-radius: 6px; aspect-ratio: 9/16; object-fit: cover; margin-top: 8px;">
    </div>
    <div class="card" style="padding: 12px; text-align: center;">
      <div class="title" style="font-size: 14px;">Scene 5: Balcony Sunset Solitude</div>
      <div class="desc" style="font-size: 11px;">"Keep going, you're not out of time."</div>
      <img src="/image/scene_5_balcony_sunset.jpg" style="width: 100%; border-radius: 6px; aspect-ratio: 9/16; object-fit: cover; margin-top: 8px;">
    </div>
  </div>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  if (url.startsWith('/video/')) {
    const filename = url.replace('/video/', '');
    const filepath = path.join(OUTPUT_DIR, filename);
    serveFile(filepath, res);
    return;
  }

  if (url.startsWith('/image/')) {
    const filename = url.replace('/image/', '');
    const filepath = path.join(VISUALS_V2_DIR, filename);
    serveFile(filepath, res);
    return;
  }

  if (url.startsWith('/audio/')) {
    const filename = url.replace('/audio/', '');
    const filepath = path.join(SAMPLES_DIR, filename);
    serveFile(filepath, res);
    return;
  }

  if (url.startsWith('/music/')) {
    const filename = url.replace('/music/', '');
    const filepath = path.join(MUSIC_DIR, filename);
    serveFile(filepath, res);
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

function serveFile(filepath, res) {
  if (!fs.existsSync(filepath)) {
    res.writeHead(404);
    res.end('File not found: ' + filepath);
    return;
  }
  const stat = fs.statSync(filepath);
  const ext = path.extname(filepath).toLowerCase();
  const contentType = ext === '.wav' ? 'audio/wav' : ext === '.mp3' ? 'audio/mpeg' : 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Accept-Ranges': 'bytes'
  });
  fs.createReadStream(filepath).pipe(res);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Voice Player Server running at http://localhost:${PORT}`);
});
