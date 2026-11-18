import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = 'C:/Users/majji/whisprs_video_studio';
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const FLOW_DIR = 'C:/Users/majji/flow-mcp-out/WhisprsVideo4';
const VOICE_PATH = 'C:/Users/majji/whisprs_video_studio/audio/whisprs_video4_voicestudio_raw.wav';
const MUSIC_PATH = 'C:/Users/majji/OneDrive/Desktop/music/Breathe_and_Allow_Things_to_Pass_denoised.wav';
const ASS_PATH = path.join(ROOT_DIR, 'scratch', 'whisprs_flow_video4.ass');

export async function produceFlowWhisprsVideo4(params = {}) {
  const timestamp = Date.now();
  const jobId = params.job_id || `whisprs_flow_video4_master`;

  // 5 distinct scenes matching each sentence of the newly synthesized speech with cloned voice 'whisper'
  const scenes = [
    {
      file: path.join(FLOW_DIR, 'scene-01.jpeg'), // Passenger train window at twilight, rain streaks, warm amber glow
      dur: 3.35,
      sentence: "You are not behind in life; you are simply on your own clock.",
      zoom: "min(1.0+0.0006*on,1.12)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)+0.05*on"
    },
    {
      file: path.join(FLOW_DIR, 'scene-02.jpeg'), // Solitary figure on wooden dock gazing at glowing crescent moon on mountain lake
      dur: 2.95,
      sentence: "The moon does not race the sun to prove its light.",
      zoom: "min(1.02+0.0005*on,1.12)",
      x: "iw/2-(iw/zoom/2)+0.15*on",
      y: "ih/2-(ih/zoom/2)"
    },
    {
      file: path.join(FLOW_DIR, 'scene-03.jpeg'), // Ancient solitary maple tree with falling golden autumn leaves & quiet bench
      dur: 2.50,
      sentence: "Be patient with the seasons of your growth.",
      zoom: "min(1.04+0.0006*on,1.14)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)-0.08*on"
    },
    {
      file: path.join(FLOW_DIR, 'scene-04.jpeg'), // Close-up of crystal water droplet falling into silent cavern pool with glowing ripples
      dur: 3.40,
      sentence: "Even the deepest rivers begin with a single, quiet drop.",
      zoom: "max(1.12-0.0005*on,1.03)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)-0.10*on"
    },
    {
      file: path.join(FLOW_DIR, 'scene-05.jpeg'), // Solitary traveler walking down lantern-lit cobblestone lane into evening mist
      dur: 5.80,
      sentence: "Walk gently, and let time carry what you were never meant to rush.",
      zoom: "max(1.14-0.0004*on,1.02)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)+0.08*on"
    }
  ];

  const totalDuration = scenes.reduce((sum, s) => sum + s.dur, 0); // 18.00s
  console.log(`\n======================================================`);
  console.log(`[Whisprs Flow 100% Sync Engine] STARTING RENDER: ${jobId}`);
  console.log(`Voice Studio Cloned Voice: 'whisper' (Profile 2418c327)`);
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
    title: params.title || "You Are Not Behind In Life",
    hook: "You are not behind in life; you are simply on your own clock.",
    category: "Patience & Growth",
    script: "You are not behind in life; you are simply on your own clock. The moon does not race the sun to prove its light. Be patient with the seasons of your growth. Even the deepest rivers begin with a single, quiet drop. Walk gently, and let time carry what you were never meant to rush.",
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
if (process.argv[1] && process.argv[1].endsWith('render_flow_whisprs_video4.mjs')) {
  produceFlowWhisprsVideo4()
    .then(res => {
      console.log('\n[Whisprs Video 4 Result]:', JSON.stringify(res, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('Render failed:', err);
      process.exit(1);
    });
}
