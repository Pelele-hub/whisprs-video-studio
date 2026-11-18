// render_video1_flow_snowfall.mjs - Renders Video 1 with Google Flow Images (WhisprsVideo6) + Snowfall ambient section + Qwen 0.6B Voice (-15%)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const AUDIO_DIR = path.join(ROOT_DIR, 'audio');
const SCRATCH_DIR = path.join(ROOT_DIR, 'scratch');

const FLOW_DIR = 'C:/Users/majji/flow-mcp-out/WhisprsVideo6';
const MUSIC_PATH = path.join(AUDIO_DIR, 'snowfall_curated_25s.wav');
const PACED_VOICE_FILE = path.join(AUDIO_DIR, 'whisprs_v6_speech1_paced.wav');
const ASS_FILE = path.join(SCRATCH_DIR, 'whisprs_v6_video1.ass');

const jobId = 'whisprs_video1_snowfall_master';
const finalMp4Path = path.join(OUTPUT_DIR, `${jobId}.mp4`);
const thumbPath = path.join(OUTPUT_DIR, `${jobId}_thumb.jpg`);
const finalAssPath = path.join(OUTPUT_DIR, `${jobId}.ass`);

console.log(`\n======================================================`);
console.log(`[Whisprs Video 1] RENDERING WITH GOOGLE FLOW (WhisprsVideo6)`);
console.log(`Music: oneheart x reidenshi snowfall (curated 14s-39s)`);
console.log(`Speech: "not everything that feels lost is truly gone..." (-15% speed)`);
console.log(`Visuals: Prompts 11-14 from catalog`);
console.log(`======================================================\n`);

const scenes = [
  {
    prompt_id: 11,
    title: "Abandoned Park Bench",
    file: path.join(FLOW_DIR, 'scene-01.jpeg'),
    dur: 4.50,
    zoom: "min(1.0+0.0005*on,1.10)",
    x: "iw/2-(iw/zoom/2)",
    y: "ih/2-(ih/zoom/2)+0.04*on"
  },
  {
    prompt_id: 12,
    title: "Seashore Twilight",
    file: path.join(FLOW_DIR, 'scene-02.jpeg'),
    dur: 4.50,
    zoom: "min(1.02+0.0004*on,1.10)",
    x: "iw/2-(iw/zoom/2)-0.10*on",
    y: "ih/2-(ih/zoom/2)"
  },
  {
    prompt_id: 13,
    title: "Empty Apartment Corner",
    file: path.join(FLOW_DIR, 'scene-03.jpeg'),
    dur: 4.00,
    zoom: "max(1.10-0.0004*on,1.02)",
    x: "iw/2-(iw/zoom/2)",
    y: "ih/2-(ih/zoom/2)-0.06*on"
  },
  {
    prompt_id: 14,
    title: "Night Highway Bridge",
    file: path.join(FLOW_DIR, 'scene-04.jpeg'),
    dur: 11.00,
    zoom: "min(1.02+0.0004*on,1.12)",
    x: "iw/2-(iw/zoom/2)",
    y: "ih/2-(ih/zoom/2)+0.06*on"
  }
];

const totalDuration = scenes.reduce((sum, s) => sum + s.dur, 0); // 24.00s
console.log(`Total duration: ${totalDuration.toFixed(2)}s`);

for (const s of scenes) {
  if (!fs.existsSync(s.file)) {
    throw new Error(`Scene image missing: ${s.file}`);
  }
  console.log(`   [Prompt #${s.prompt_id}] ${s.title} -> ${path.basename(s.file)}`);
}

fs.copyFileSync(ASS_FILE, finalAssPath);

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
const safeAssPath = finalAssPath.replace(/\\/g, '/').replace(/:/g, '\\:');

filterStr += `${concatInputs}concat=n=${scenes.length}:v=1:a=0[vcat];`;
filterStr += `[vcat]noise=alls=6:allf=t+u,vignette=PI/4.3[vfilm];`;
filterStr += `[vfilm]ass='${safeAssPath}'[vout];`;

const voiceIdx = scenes.length;
const musicIdx = scenes.length + 1;
const fadeOutStart = (totalDuration - 2.8).toFixed(1);

// Voice volume boosted, background music ducked to ambient level
filterStr += `[${voiceIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.40,apad=pad_dur=3.5[vpad];`;
filterStr += `[${musicIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.30,afade=t=in:st=0:d=1.0,afade=t=out:st=${fadeOutStart}:d=2.8[bgm];`;
filterStr += `[vpad][bgm]amix=inputs=2:duration=first:dropout_transition=2,volume=1.50,alimiter=limit=-0.8dB[aout]`;

const cmd = [
  'ffmpeg', '-y',
  ...inputArgs,
  '-filter_complex', `"${filterStr}"`,
  '-map', '[vout]',
  '-map', '[aout]',
  '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k',
  '-t', totalDuration.toFixed(2),
  `"${finalMp4Path}"`
].join(' ');

console.log('[Whisprs Video 1] Rendering master video with FFmpeg...');
execSync(cmd, { stdio: 'inherit' });

// Generate poster thumbnail
execSync(`ffmpeg -y -ss 00:00:02.50 -i "${finalMp4Path}" -vframes 1 "${thumbPath}"`, { stdio: 'ignore' });
console.log(`\n[Whisprs Video 1] RENDER COMPLETE!`);
console.log(`MP4: ${finalMp4Path}`);
console.log(`Thumbnail: ${thumbPath}`);
console.log(`Subtitles: ${finalAssPath}`);
