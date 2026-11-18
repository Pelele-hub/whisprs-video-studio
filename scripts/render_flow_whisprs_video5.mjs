import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = 'C:/Users/majji/whisprs_video_studio';
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const FLOW_DIR = 'C:/Users/majji/flow-mcp-out/WhisprsVideo5';
const VOICE_PATH = 'C:/Users/majji/whisprs_video_studio/audio/whisprs_video5_paced_1s_pause.wav';
const MUSIC_PATH = 'C:/Users/majji/OneDrive/Desktop/music/Breathe_and_Allow_Things_to_Pass_denoised.wav';
const ASS_PATH = path.join(ROOT_DIR, 'scratch', 'whisprs_flow_video5_paced.ass');

export async function produceFlowWhisprsVideo5(params = {}) {
  const timestamp = Date.now();
  const jobId = params.job_id || `whisprs_flow_video5_master`;

  // 5 distinct scenes matching each sentence of the newly synthesized speech with cloned voice 'whisper'
  // Slower reading pace + exact 1.0s pause between each phrase
  // Generated from the new prompt catalog (Prompts 1 - 5)
  const scenes = [
    {
      file: path.join(FLOW_DIR, 'scene-06.jpeg'), // Overcast Field Silhouette
      dur: 3.76,
      sentence: "You don't have to carry the weight of everything you cannot change.",
      zoom: "min(1.0+0.0006*on,1.12)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)+0.05*on"
    },
    {
      file: path.join(FLOW_DIR, 'scene-07.jpeg'), // Subway Platform Solitude
      dur: 4.22,
      sentence: "It's okay to feel tired in a world that never stops moving.",
      zoom: "min(1.02+0.0005*on,1.12)",
      x: "iw/2-(iw/zoom/2)+0.15*on",
      y: "ih/2-(ih/zoom/2)"
    },
    {
      file: path.join(FLOW_DIR, 'scene-08.jpeg'), // Rainy Window Glow
      dur: 4.54,
      sentence: "Healing is not a race; it is simply learning to breathe again.",
      zoom: "min(1.04+0.0006*on,1.14)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)-0.08*on"
    },
    {
      file: path.join(FLOW_DIR, 'scene-09.jpeg'), // Dusk Pier Reflection
      dur: 4.00,
      sentence: "Give yourself grace for the silent battles nobody ever saw.",
      zoom: "max(1.12-0.0005*on,1.03)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)-0.10*on"
    },
    {
      file: path.join(FLOW_DIR, 'scene-10.jpeg'), // Train Car Quiet
      dur: 7.04,
      sentence: "Tonight, let your heavy thoughts rest, and trust that tomorrow will be kinder.",
      zoom: "max(1.14-0.0004*on,1.02)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)+0.08*on"
    }
  ];

  const totalDuration = scenes.reduce((sum, s) => sum + s.dur, 0); // 23.56s
  console.log(`\n======================================================`);
  console.log(`[Whisprs Flow 100% Sync Engine] STARTING RENDER: ${jobId}`);
  console.log(`Voice Studio Cloned Voice: 'whisper' (Profile 2418c327)`);
  console.log(`Visual Prompts: Curated 9:16 Prompts 1 - 5 from Catalog`);
  console.log(`Total Scenes: ${scenes.length} (1 scene per sentence)`);
  console.log(`Total Duration: ${totalDuration.toFixed(2)}s`);
  console.log(`Pause-Disappear Subtitles: Active`);
  console.log(`======================================================\n`);

  for (const s of scenes) {
    if (!fs.existsSync(s.file)) {
      throw new Error(`Scene image missing: ${s.file}`);
    }
  }

  const inputArgs = [];
  scenes.forEach(s => {
    inputArgs.push('-loop', '1', '-t', (s.dur + 0.5).toFixed(2), '-i', s.file);
  });
  inputArgs.push('-i', VOICE_PATH);
  inputArgs.push('-stream_loop', '-1', '-i', MUSIC_PATH);

  let filterStr = '';
  scenes.forEach((s, idx) => {
    filterStr += `[${idx}:v]scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1,zoompan=z='${s.zoom}':d=1:x='${s.x}':y='${s.y}':s=1080x1920:fps=30,setsar=1,trim=duration=${s.dur.toFixed(2)}[v${idx}];`;
  });

  const concatInputs = scenes.map((_, i) => `[v${i}]`).join('');
  const safeAssPath = ASS_PATH.replace(/\\/g, '/').replace(/:/g, '\\:');

  filterStr += `${concatInputs}concat=n=${scenes.length}:v=1:a=0[vcat];`;
  filterStr += `[vcat]noise=alls=8:allf=t+u,vignette=PI/4.3[vfilm];`;
  filterStr += `[vfilm]ass='${safeAssPath}'[vout];`;

  const voiceIdx = scenes.length;
  const musicIdx = scenes.length + 1;
  const fadeOutStart = (totalDuration - 2.5).toFixed(1);
  filterStr += `[${voiceIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.35,apad=pad_dur=3.0[vpad];`;
  filterStr += `[${musicIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.28,afade=t=in:st=0:d=0.8,afade=t=out:st=${fadeOutStart}:d=2.5[bgm];`;
  filterStr += `[vpad][bgm]amix=inputs=2:duration=first:dropout_transition=2,volume=1.6,alimiter=limit=-0.8dB[aout]`;

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

  console.log('[Whisprs Flow 100% Sync Engine] Executing FFmpeg Render Pipeline...');
  execSync(cmd, { stdio: 'inherit' });

  // Generate poster thumbnail
  execSync(`ffmpeg -y -ss 00:00:02.50 -i "${finalMp4Path}" -vframes 1 "${thumbPath}"`, { stdio: 'ignore' });
  console.log(`[Whisprs Flow 100% Sync Engine] RENDER COMPLETE: ${finalMp4Path}`);

  return {
    job_id: jobId,
    video_id: jobId,
    title: params.title || "You Don't Have to Carry the Weight",
    hook: "You don't have to carry the weight of everything you cannot change.",
    category: "Healing & Peace",
    script: "You don't have to carry the weight of everything you cannot change. It's okay to feel tired in a world that never stops moving. Healing is not a race; it is simply learning to breathe again. Give yourself grace for the silent battles nobody ever saw. Tonight, let your heavy thoughts rest, and trust that tomorrow will be kinder.",
    duration_seconds: totalDuration,
    scenes_count: scenes.length,
    mp4_path: finalMp4Path,
    thumbnail_path: thumbPath,
    stream_url: `http://localhost:5055/stream/${jobId}.mp4`,
    poster_url: `http://localhost:5055/stream/${jobId}_thumb.jpg`,
    timestamp: new Date().toISOString()
  };
}

// Allow direct CLI execution
if (process.argv[1] && process.argv[1].endsWith('render_flow_whisprs_video5.mjs')) {
  produceFlowWhisprsVideo5()
    .then(res => {
      console.log('\n[Whisprs Video 5 Result]:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Render failed:', err);
      process.exit(1);
    });
}
