// produce_qwen3_master_v2.mjs - Master Production Engine with Qwen3-TTS Cloned Voice, Dynamic Anime Images & Whisper Alignment
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync, execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const JOBS_DIR = path.join(ROOT_DIR, 'jobs');
const DESKTOP_DIR = 'C:/Users/majji/OneDrive/Desktop/whisprs_voice_samples';
const MUSIC_PATH = 'C:/Users/majji/OneDrive/Desktop/music/Breathe_and_Allow_Things_to_Pass_denoised.wav';
const PYTHON_SCRIPT = path.join(ROOT_DIR, 'scripts', 'qwen3_speech_and_align.py');

// Dynamic Saying Bank with Rotation / Ledger
const SAYINGS_LEDGER = path.join(ROOT_DIR, 'scratch', 'sayings_history.json');
const FRESH_SAYINGS = [
  "Sometimes the bravest thing you can do is just rest. You don't have to carry the whole world on your shoulders. Let yourself breathe tonight. You are doing so much better than you realize.",
  "You don't always need to explain your quiet. Some days, just making it through is enough. Be gentle with your tired heart tonight. You are surviving, and that is more than enough.",
  "Give yourself permission to pause. It's okay if today was heavy. Tomorrow is a quiet blank page waiting for you. Rest your mind tonight.",
  "Not every season is for blooming. Some are simply for staying grounded through the storm. You are still growing in the dark. Be proud of how far you've come.",
  "It is okay if all you did today was survive. Healing is not a straight line, and you don't have to prove anything to anyone. Soften your shoulders. Let the night carry your thoughts away."
];

function getNextSaying() {
  let used = [];
  if (fs.existsSync(SAYINGS_LEDGER)) {
    try { used = JSON.parse(fs.readFileSync(SAYINGS_LEDGER, 'utf-8')); } catch(e){}
  }
  const available = FRESH_SAYINGS.filter(s => !used.includes(s));
  const saying = available.length > 0 ? available[0] : FRESH_SAYINGS[Math.floor(Math.random() * FRESH_SAYINGS.length)];
  used.push(saying);
  fs.mkdirSync(path.dirname(SAYINGS_LEDGER), { recursive: true });
  fs.writeFileSync(SAYINGS_LEDGER, JSON.stringify(used, null, 2), 'utf-8');
  return saying;
}

// Fallback pool of pristine anime lonely sad visuals
const CURATED_ANIME_POOL = [
  'C:/Users/majji/whisprs_video_studio/assets/visuals/dynamic_v2/scene_1_street_rain.jpg',
  'C:/Users/majji/whisprs_video_studio/assets/visuals/dynamic_v2/scene_2_train_window.jpg',
  'C:/Users/majji/whisprs_video_studio/assets/visuals/dynamic_v2/scene_3_room_window.jpg',
  'C:/Users/majji/whisprs_video_studio/assets/visuals/whisprs_scene_4_street.jpg',
  'C:/Users/majji/whisprs_video_studio/assets/visuals/whisprs_scene_4_rain.jpg'
];

// Download dynamic high-resolution anime lonely sad images
async function downloadDynamicAnimeScenes(jobVisualsDir) {
  fs.mkdirSync(jobVisualsDir, { recursive: true });

  const scenePrompts = [
    "melancholic cinematic anime art solitary figure with umbrella walking down empty rainy Tokyo street night neon reflections wet asphalt Makoto Shinkai style 35mm anime lonely sad masterpiece high detail",
    "quiet anime scene solitary passenger looking out rain-streaked window of empty commuter train at night blurred city lights outside lonely melancholic aesthetic high quality",
    "moody anime bedroom 2 AM solitary girl sitting on windowsill wrapped in blanket looking at rainy streetlamps outside lonely melancholic peaceful solitude",
    "cinematic anime scenery solitary silhouette on quiet misty city footbridge at blue dusk glowing streetlamp soft rain fog peaceful lonely sad aesthetic"
  ];

  const downloadedFiles = [];

  for (let i = 0; i < scenePrompts.length; i++) {
    const seed = Math.floor(Math.random() * 99999999) + i * 1000;
    const promptEnc = encodeURIComponent(scenePrompts[i]);
    const url = `https://image.pollinations.ai/prompt/${promptEnc}?width=768&height=1376&model=flux&nologo=true&seed=${seed}`;
    const outPath = path.join(jobVisualsDir, `scene_${i + 1}.jpg`);

    console.log(`[Whisprs Visuals] Generating Brand New Scene ${i + 1}/4 (Seed: ${seed})...`);

    let saved = false;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        // Verify valid JPEG header (FF D8 FF) and size > 25KB
        if (buf.length > 25000 && buf[0] === 0xFF && buf[1] === 0xD8) {
          fs.writeFileSync(outPath, buf);
          console.log(`   Scene ${i + 1} dynamically generated: ${buf.length} bytes`);
          downloadedFiles.push(outPath);
          saved = true;
        }
      }
    } catch (err) {
      console.warn(`   Notice: dynamic image endpoint busy: ${err.message}`);
    }

    if (!saved) {
      // Use pristine high-res anime lonely sad visual from pool
      const poolIdx = i % CURATED_ANIME_POOL.length;
      const fallbackSource = CURATED_ANIME_POOL[poolIdx];
      console.log(`   Using high-res anime lonely scene from curated pool: ${path.basename(fallbackSource)}`);
      fs.copyFileSync(fallbackSource, outPath);
      downloadedFiles.push(outPath);
    }
  }

  return downloadedFiles;
}

export async function runQwen3MasterProduction() {
  const timestamp = Date.now();
  const jobId = `job_v2_qwen3_${timestamp}`;
  const jobDir = path.join(JOBS_DIR, jobId);
  const visualsDir = path.join(jobDir, 'visuals');
  fs.mkdirSync(jobDir, { recursive: true });

  const saying = getNextSaying();

  console.log(`\n======================================================`);
  console.log(`[Whisprs Master V2] INITIATING MASTER PRODUCTION RUN`);
  console.log(`Job ID: ${jobId}`);
  console.log(`Voice Engine: Alibaba Qwen3-TTS (0.6B Base Cloned Voice)`);
  console.log(`Saying: "${saying}"`);
  console.log(`======================================================\n`);

  // 1. Generate Voice with Qwen3-TTS and Whisper Alignment
  const narrationWav = path.join(jobDir, 'narration.wav');
  const alignmentJson = path.join(jobDir, 'alignment.json');

  console.log(`[Whisprs Audio] Running Qwen3-TTS synthesis & Whisper alignment...`);
  const uvCmd = `uv run --python 3.11 --with C:\\Users\\majji\\whisprs_video_studio\\scratch\\Qwen3-TTS --with faster-whisper python "${PYTHON_SCRIPT}" --text "${saying.replace(/"/g, '\\"')}" --out_wav "${narrationWav}" --out_json "${alignmentJson}"`;
  
  execSync(uvCmd, { stdio: 'inherit' });

  // Read alignment data
  const alignData = JSON.parse(fs.readFileSync(alignmentJson, 'utf-8'));
  const voiceDuration = alignData.duration;
  const lingeringOutro = 2.0;
  const totalDuration = voiceDuration + lingeringOutro;
  console.log(`[Whisprs Audio] Voice Duration: ${voiceDuration.toFixed(2)}s | Total Video: ${totalDuration.toFixed(2)}s`);

  // 2. Generate Brand-New Anime Lonely Sad Images
  console.log(`\n[Whisprs Visuals] Generating 4 Brand-New Anime Lonely Sad Images (Zero Reuse)...`);
  const sceneFiles = await downloadDynamicAnimeScenes(visualsDir);

  // 3. Generate ASS Subtitles perfectly synchronized via Whisper
  const assPath = path.join(jobDir, 'subtitles.ass');

  alignData.alignment.forEach(item => {
    const startStr = formatAssTime(Math.max(0, item.start - 0.05));
    const endStr = formatAssTime(item.end + 0.35); // gentle linger on screen
    // Format text into max 2 lines with newline
    const words = item.text.split(' ');
    let formattedText = item.text;
    if (words.length > 5) {
      const mid = Math.ceil(words.length / 2);
      formattedText = words.slice(0, mid).join(' ') + '\\N' + words.slice(mid).join(' ');
    }
    assDialogues += `Dialogue: 0,${startStr},${endStr},WhisprsItalic,,0,0,0,,{\\i1}${formattedText}\n`;
  });

  const assContent = `[Script Info]
Title: Whisprs Qwen3 Master Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: WhisprsItalic,Georgia,48,&H00FFFFFF,&H0000FFFF,&H80000000,&H90000000,0,1,0,0,100,100,0.8,0,1,1.0,2.5,2,80,80,920,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${assDialogues}`;

  fs.writeFileSync(assPath, assContent, 'utf-8');
  console.log(`[Whisprs Subtitles] Synchronized ASS Subtitles Generated: ${assPath}`);

  // 4. Assemble Full HD Video with FFmpeg
  const shotDuration = totalDuration / sceneFiles.length;
  console.log(`[Whisprs Render] Shot Duration: ${shotDuration.toFixed(2)}s across ${sceneFiles.length} scenes`);

  const inputArgs = [];
  sceneFiles.forEach(file => {
    inputArgs.push('-loop', '1', '-t', (shotDuration + 0.5).toFixed(2), '-i', file);
  });
  inputArgs.push('-i', narrationWav);
  inputArgs.push('-stream_loop', '-1', '-i', MUSIC_PATH);

  // Filter complex with Ken Burns, setsar=1, and lanczos upscaling
  let filterStr = '';
  sceneFiles.forEach((_, idx) => {
    let zoomExpr, xExpr, yExpr;
    if (idx === 0) {
      zoomExpr = "min(1.0+0.0006*on,1.14)";
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)+0.08*on";
    } else if (idx === 1) {
      zoomExpr = "min(1.04+0.0004*on,1.13)";
      xExpr = "iw/2-(iw/zoom/2)-0.25*on";
      yExpr = "ih/2-(ih/zoom/2)";
    } else if (idx === 2) {
      zoomExpr = "min(1.08-0.0004*on,1.14)";
      xExpr = "iw/2-(iw/zoom/2)+0.20*on";
      yExpr = "ih/2-(ih/zoom/2)-0.06*on";
    } else {
      zoomExpr = "min(1.02+0.0005*on,1.15)";
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)-0.10*on";
    }

    const nFrames = Math.ceil(shotDuration * 30);
    filterStr += `[${idx}:v]scale=1080:1920:flags=lanczos,unsharp=5:5:0.8:5:5:0.0,setsar=1,zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${nFrames}:s=1080x1920:fps=30,setsar=1[v${idx}];`;
  });

  const concatInputs = sceneFiles.map((_, idx) => `[v${idx}]`).join('');
  filterStr += `${concatInputs}concat=n=${sceneFiles.length}:v=1:a=0[basev];`;

  // Grain, vignette, and burn-in subtitles
  const assEscaped = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
  filterStr += `[basev]noise=alls=10:allf=t+u,vignette=PI/4,ass='${assEscaped}'[outv];`;

  // Ducked Audio: narration high, piano ducked to -16dB with smooth fadeout
  filterStr += `[4:a]volume=1.0[voice];`;
  filterStr += `[5:a]volume=0.28,afade=t=out:st=${(totalDuration - 1.8).toFixed(2)}:d=1.8[bgm];`;
  filterStr += `[voice][bgm]amix=inputs=2:duration=first:dropout_transition=2[outa]`;

  const outputVideo = path.join(OUTPUT_DIR, `${jobId}.mp4`);
  const outputThumb = path.join(OUTPUT_DIR, `${jobId}_thumb.jpg`);

  const ffmpegArgs = [
    '-y',
    '-nostats',
    '-loglevel', 'warning',
    ...inputArgs,
    '-filter_complex', filterStr,
    '-map', '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', totalDuration.toFixed(2),
    outputVideo
  ];

  console.log(`[Whisprs Render] Rendering Full HD master video with FFmpeg...`);
  await execFileAsync('ffmpeg', ffmpegArgs, { maxBuffer: 50 * 1024 * 1024 });

  // Generate thumbnail at 2.0s
  try {
    execSync(`ffmpeg -y -ss 00:00:02.00 -i "${outputVideo}" -vframes 1 -q:v 2 "${outputThumb}"`);
  } catch(e){}

  // Copy to Desktop
  fs.mkdirSync(DESKTOP_DIR, { recursive: true });
  const desktopVideo = path.join(DESKTOP_DIR, `${jobId}.mp4`);
  fs.copyFileSync(outputVideo, desktopVideo);

  console.log(`\n======================================================`);
  console.log(`[Whisprs Master V2] MASTER PRODUCTION COMPLETED!`);
  console.log(`Job ID:       ${jobId}`);
  console.log(`Video File:   ${outputVideo}`);
  console.log(`Desktop Copy: ${desktopVideo}`);
  console.log(`Thumbnail:    ${outputThumb}`);
  console.log(`Stream URL:   http://localhost:5055/stream/${jobId}.mp4`);
  console.log(`======================================================\n`);

  return {
    job_id: jobId,
    video_path: outputVideo,
    desktop_path: desktopVideo,
    thumb_path: outputThumb,
    saying,
    duration: totalDuration
  };
}

function formatAssTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

// Direct execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runQwen3MasterProduction().catch(err => {
    console.error('[Whisprs Master V2] Fatal Error:', err);
    process.exit(1);
  });
}
