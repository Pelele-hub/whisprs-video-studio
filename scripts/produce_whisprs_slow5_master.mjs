// produce_whisprs_slow5_master.mjs - Master Engine with Original Cloned Voice 5% Slower & Zero Points
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const SCRATCH_DIR = path.join(ROOT_DIR, 'scratch');
const AUDIO_DIR = path.join(ROOT_DIR, 'audio');
const REGISTRY_PATH = path.join(ROOT_DIR, 'config', 'whisprs_used_registry.json');

const FLOW_DIR = 'C:/Users/majji/flow-mcp-out/WhisprsBatchFresh3';
const MUSIC_PATH = path.join(AUDIO_DIR, 'snowfall_curated_25s.wav');
const PACED_VOICE_FILE = path.join(AUDIO_DIR, 'whisprs_cloned_slow5_paced.wav');
const ASS_FILE = path.join(SCRATCH_DIR, 'whisprs_cloned_slow5.ass');
const META_JSON = path.join(SCRATCH_DIR, 'whisprs_cloned_slow5_meta.json');

export async function produceWhisprsSlow5Master(params = {}) {
  const timestamp = Date.now();
  const jobId = params.job_id || `whisprs_cloned_slow5_master_${timestamp}`;

  console.log(`\n======================================================`);
  console.log(`[Whisprs Master Engine - Slow 5%] PRODUCTION RUN`);
  console.log(`Job ID: ${jobId}`);
  console.log(`Voice Engine: Original Alibaba Qwen 0.6B Cloned Voice (Whisper Reference)`);
  console.log(`Speed: Exactly 5% Slower (atempo=0.95, pitch preserved, natural warmth)`);
  console.log(`Punctuation: Strictly ZERO Points / No Periods in sentences or subtitles`);
  console.log(`Visuals: 4 Fresh Google Flow images (WhisprsBatchFresh3)`);
  console.log(`Target Window: 20.0s - 30.0s`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(PACED_VOICE_FILE) || !fs.existsSync(ASS_FILE)) {
    throw new Error(`Audio or ASS subtitle file missing: ${PACED_VOICE_FILE} / ${ASS_FILE}`);
  }

  const meta = JSON.parse(fs.readFileSync(META_JSON, 'utf-8'));
  const totalDuration = meta.total_duration; // 21.98s
  console.log(`[Whisprs Slow 5%] Video Duration: ${totalDuration.toFixed(2)}s (Window: 20s - 30s)`);

  if (totalDuration < 20.0 || totalDuration > 30.0) {
    throw new Error(`Duration ${totalDuration}s is outside strict 20.0s - 30.0s limit!`);
  }

  // 4 fresh Google Flow scenes
  const sceneFiles = [
    path.join(FLOW_DIR, 'scene-01.jpeg'),
    path.join(FLOW_DIR, 'scene-02.jpeg'),
    path.join(FLOW_DIR, 'scene-03.jpeg'),
    path.join(FLOW_DIR, 'scene-04.jpeg')
  ];

  for (const f of sceneFiles) {
    if (!fs.existsSync(f)) {
      throw new Error(`Scene file does not exist: ${f}`);
    }
  }

  const shotDur = totalDuration / sceneFiles.length; // ~5.50s per scene
  console.log(`[Whisprs Slow 5%] Scenes: 4 | Duration per scene: ${shotDur.toFixed(2)}s`);

  const scenes = [
    {
      file: sceneFiles[0],
      dur: shotDur,
      zoom: "min(1.0+0.00045*on,1.10)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)+0.04*on"
    },
    {
      file: sceneFiles[1],
      dur: shotDur,
      zoom: "min(1.02+0.0004*on,1.10)",
      x: "iw/2-(iw/zoom/2)-0.10*on",
      y: "ih/2-(ih/zoom/2)"
    },
    {
      file: sceneFiles[2],
      dur: shotDur,
      zoom: "max(1.10-0.0004*on,1.02)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)-0.05*on"
    },
    {
      file: sceneFiles[3],
      dur: shotDur,
      zoom: "min(1.01+0.00045*on,1.10)",
      x: "iw/2-(iw/zoom/2)+0.08*on",
      y: "ih/2-(ih/zoom/2)"
    }
  ];

  const assPath = path.join(OUTPUT_DIR, `${jobId}_subtitles.ass`);
  fs.copyFileSync(ASS_FILE, assPath);

  const inputArgs = [];
  scenes.forEach(s => {
    inputArgs.push('-loop', '1', '-t', (s.dur + 0.5).toFixed(2), '-i', s.file);
  });
  inputArgs.push('-i', PACED_VOICE_FILE);
  inputArgs.push('-stream_loop', '-1', '-i', MUSIC_PATH);

  let filterStr = '';
  scenes.forEach((s, idx) => {
    filterStr += `[${idx}:v]scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1,zoompan=z='${s.zoom}':d=1:x='${s.x}':y='${s.y}':s=1080x1920:fps=30,setsar=1,trim=duration=${s.dur.toFixed(2)}[v${idx}];`;
  });

  const concatInputs = scenes.map((_, i) => `[v${i}]`).join('');
  const safeAssPath = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');

  filterStr += `${concatInputs}concat=n=${scenes.length}:v=1:a=0[vcat];`;
  filterStr += `[vcat]noise=alls=7:allf=t+u,vignette=PI/4.3[vfilm];`;
  filterStr += `[vfilm]ass='${safeAssPath}'[vout];`;

  const voiceIdx = scenes.length;
  const musicIdx = scenes.length + 1;
  const fadeOutStart = (totalDuration - 2.5).toFixed(2);

  filterStr += `[${voiceIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.35,apad=pad_dur=3.0[vpad];`;
  filterStr += `[${musicIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.26,afade=t=in:st=0:d=0.8,afade=t=out:st=${fadeOutStart}:d=2.5[bgm];`;
  filterStr += `[vpad][bgm]amix=inputs=2:duration=first:dropout_transition=2,volume=1.55,alimiter=limit=-0.8dB[aout]`;

  const finalMp4Path = path.join(OUTPUT_DIR, `${jobId}.mp4`);
  const thumbPath = path.join(OUTPUT_DIR, `${jobId}_thumb.jpg`);

  const cmd = [
    'ffmpeg', '-y',
    ...inputArgs,
    '-filter_complex', `"${filterStr}"`,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'h264_mf', '-b:v', '9M',
    '-c:a', 'aac', '-b:a', '192k',
    '-t', totalDuration.toFixed(2),
    `"${finalMp4Path}"`
  ].join(' ');

  console.log('[Whisprs Render] Executing FFmpeg Render with Hardware Acceleration (h264_mf)...');
  execSync(cmd, { stdio: 'inherit' });

  // Generate poster thumbnail
  execSync(`ffmpeg -y -ss 00:00:03.00 -i "${finalMp4Path}" -vframes 1 "${thumbPath}"`, { stdio: 'ignore' });
  console.log(`[Whisprs Render] COMPLETE! Saved to: ${finalMp4Path}`);

  // Register in Single-Use Registry
  let registry = { used_speeches: [], used_images: [], jobs: [] };
  if (fs.existsSync(REGISTRY_PATH)) {
    try {
      registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
    } catch (e) {}
  }

  const scriptFull = meta.events.map(e => e.text).join(' - ');
  registry.used_speeches.push({ job_id: jobId, script: scriptFull, timestamp: new Date().toISOString() });
  sceneFiles.forEach(f => registry.used_images.push({ job_id: jobId, file: f, timestamp: new Date().toISOString() }));
  registry.jobs.push({
    job_id: jobId,
    duration: totalDuration,
    created_at: new Date().toISOString(),
    video_path: finalMp4Path,
    thumbnail_path: thumbPath
  });

  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');
  console.log(`[Whisprs Registry] Single-use assets logged to ${REGISTRY_PATH}`);

  return {
    job_id: jobId,
    video_id: jobId,
    title: params.title || "Learning to Breathe",
    hook: "you don't have to carry the weight of everything",
    script: scriptFull,
    duration: totalDuration,
    video_path: finalMp4Path,
    thumbnail_path: thumbPath,
    stream_url: `http://localhost:5055/stream/${path.basename(finalMp4Path)}`,
    thumb_url: `http://localhost:5055/stream/${path.basename(thumbPath)}`
  };
}

if (process.argv[1] && process.argv[1].endsWith('produce_whisprs_slow5_master.mjs')) {
  produceWhisprsSlow5Master().then(res => {
    console.log('\nResult:', JSON.stringify(res, null, 2));
  }).catch(err => {
    console.error('Render failed:', err);
    process.exit(1);
  });
}
