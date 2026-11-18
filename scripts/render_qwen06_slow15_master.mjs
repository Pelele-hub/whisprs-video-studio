// render_qwen06_slow15_master.mjs - Renders Master Video using the User's EXACT Curated Prompts Catalog 1-5 + Qwen 0.6 Voice (-15% Speed, 22.10s)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const SCRATCH_DIR = path.join(ROOT_DIR, 'scratch');
const AUDIO_DIR = path.join(ROOT_DIR, 'audio');
const FLOW_DIR = 'C:/Users/majji/flow-mcp-out/WhisprsVideo5';
const MUSIC_PATH = 'C:/Users/majji/OneDrive/Desktop/music/Breathe_and_Allow_Things_to_Pass_denoised.wav';
const PACED_VOICE_FILE = path.join(AUDIO_DIR, 'whisprs_qwen06_slow15_paced.wav');
const ASS_FILE = path.join(SCRATCH_DIR, 'whisprs_flow_qwen06_slow15.ass');

export async function produceFlowWhisprsQwenSlow15(params = {}) {
  const timestamp = Date.now();
  const jobId = params.job_id || `whisprs_flow_qwen06_catalog_prompts_${timestamp}`;

  console.log(`\n======================================================`);
  console.log(`[Whisprs Master Engine] RENDERING WITH USER'S CURATED PROMPTS 1-5`);
  console.log(`Job ID: ${jobId}`);
  console.log(`Voice Engine: Alibaba Qwen 0.6B Base Cloned Voice (Whisper Reference)`);
  console.log(`Speed Rate: -15% slower delivery (atempo=0.85, pitch preserved)`);
  console.log(`Total Duration: 22.10s (calibrated between 20-30s)`);
  console.log(`Visuals: Exact Prompts from User's Catalog (image_prompts.json #1 - #5)`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(PACED_VOICE_FILE) || !fs.existsSync(ASS_FILE)) {
    console.log('[Whisprs Audio] Running pacer slow 15%...');
    execSync(`& "C:\\Users\\majji\\fb-reels-cloner\\.venv\\Scripts\\python.exe" "${path.join(__dirname, 'whisprs_pacer_slow15.py')}"`, { stdio: 'inherit' });
  }

  // 5 distinct Google Flow / Veo scenes generated from the User's exact prompt catalog (Prompts 1 to 5):
  // 1. Overcast Field Silhouette
  // 2. Subway Platform Solitude
  // 3. Rainy Window Glow
  // 4. Dusk Pier Reflection
  // 5. Train Car Quiet
  const scenes = [
    {
      prompt_id: 1,
      title: "Overcast Field Silhouette",
      file: path.join(FLOW_DIR, 'scene-06.jpeg'),
      dur: 3.75,
      sentence: "you don't have to carry the weight of everything",
      zoom: "min(1.0+0.0005*on,1.12)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)+0.05*on"
    },
    {
      prompt_id: 2,
      title: "Subway Platform Solitude",
      file: path.join(FLOW_DIR, 'scene-07.jpeg'),
      dur: 3.60,
      sentence: "because some things were never meant to be held",
      zoom: "min(1.03+0.0004*on,1.12)",
      x: "iw/2-(iw/zoom/2)-0.15*on",
      y: "ih/2-(ih/zoom/2)"
    },
    {
      prompt_id: 3,
      title: "Rainy Window Glow",
      file: path.join(FLOW_DIR, 'scene-08.jpeg'),
      dur: 3.85,
      sentence: "and when you feel tired in a world that never stops",
      zoom: "max(1.12-0.0004*on,1.03)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)-0.08*on"
    },
    {
      prompt_id: 4,
      title: "Dusk Pier Reflection",
      file: path.join(FLOW_DIR, 'scene-09.jpeg'),
      dur: 3.60,
      sentence: "remember that healing is just learning to breathe",
      zoom: "min(1.02+0.0005*on,1.12)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)-0.12*on"
    },
    {
      prompt_id: 5,
      title: "Train Car Quiet",
      file: path.join(FLOW_DIR, 'scene-10.jpeg'),
      dur: 7.30, // 4.10s speech + 3.20s lingering piano outro
      sentence: "so let your heavy thoughts rest - tomorrow will be kinder",
      zoom: "min(1.03+0.0004*on,1.12)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)+0.10*on"
    }
  ];

  const totalDuration = scenes.reduce((sum, s) => sum + s.dur, 0); // 22.10s
  console.log(`[Whisprs Render] Total Scenes: ${scenes.length} | Duration: ${totalDuration.toFixed(2)}s`);

  for (const s of scenes) {
    if (!fs.existsSync(s.file)) {
      throw new Error(`Scene image missing: ${s.file}`);
    }
    console.log(`   [Prompt #${s.prompt_id}] ${s.title} -> ${path.basename(s.file)}`);
  }

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
  const fadeOutStart = (totalDuration - 2.8).toFixed(1);

  filterStr += `[${voiceIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.35,apad=pad_dur=3.5[vpad];`;
  filterStr += `[${musicIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.28,afade=t=in:st=0:d=0.8,afade=t=out:st=${fadeOutStart}:d=2.8[bgm];`;
  filterStr += `[vpad][bgm]amix=inputs=2:duration=first:dropout_transition=2,volume=1.55,alimiter=limit=-0.8dB[aout]`;

  const finalMp4Path = path.join(OUTPUT_DIR, `${jobId}.mp4`);
  const thumbPath = path.join(OUTPUT_DIR, `${jobId}_thumb.jpg`);

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

  console.log('[Whisprs Render] Executing FFmpeg Render Pipeline...');
  execSync(cmd, { stdio: 'inherit' });

  // Generate poster thumbnail
  execSync(`ffmpeg -y -ss 00:00:03.00 -i "${finalMp4Path}" -vframes 1 "${thumbPath}"`, { stdio: 'ignore' });
  console.log(`[Whisprs Render] COMPLETE! Saved to: ${finalMp4Path}`);

  return {
    job_id: jobId,
    video_id: jobId,
    title: params.title || "Learning to Breathe (Hypnotic Pace)",
    hook: "you don't have to carry the weight of everything",
    category: "Solitude & Healing",
    script: "you don't have to carry the weight of everything - because some things were never meant to be held ... and when you feel tired in a world that never stops - remember that healing is just learning to breathe ... so let your heavy thoughts rest - tomorrow will be kinder",
    voice_engine: "qwen_0.6b_cloned_whisper_slow15",
    visual_engine: "google_flow_veo_prompts_1_to_5",
    prompts_used: [
      { id: 1, title: "Overcast Field Silhouette" },
      { id: 2, title: "Subway Platform Solitude" },
      { id: 3, title: "Rainy Window Glow" },
      { id: 4, title: "Dusk Pier Reflection" },
      { id: 5, title: "Train Car Quiet" }
    ],
    duration_seconds: totalDuration,
    scenes_count: scenes.length,
    sync_precision: "100% Whisper Word-Forced Alignment with Pause-Disappear",
    caption: `you don't have to carry the weight of everything 🖤✨\n\nbecause some things were never meant to be held ... and when you feel tired in a world that never stops - remember that healing is just learning to breathe ... so let your heavy thoughts rest - tomorrow will be kinder.\n\n#whisprs #poetry #solitude #innerpeace #healing #deepthoughts #reels #qwen`,
    hashtags: ["#whisprs", "#poetry", "#solitude", "#healing", "#innerpeace", "#reels", "#qwen"],
    stream_url: `http://localhost:5055/stream/${jobId}.mp4`,
    artifacts: {
      video_mp4: finalMp4Path,
      thumbnail_jpg: thumbPath,
      subtitles_ass: assPath
    }
  };
}

if (process.argv[1] && process.argv[1].endsWith('render_qwen06_slow15_master.mjs')) {
  produceFlowWhisprsQwenSlow15().catch(err => {
    console.error('Render failed:', err);
    process.exit(1);
  });
}
