import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = 'C:/Users/majji/whisprs_video_studio';
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const FLOW_DIR = 'C:/Users/majji/flow-mcp-out/WhisprsVideo5';
const VOICE_PATH = 'C:/Users/majji/whisprs_video_studio/audio/whisprs_video5_connected_raw.wav';
const MUSIC_PATH = 'C:/Users/majji/OneDrive/Desktop/music/Breathe_and_Allow_Things_to_Pass_denoised.wav';
const ASS_PATH = path.join(ROOT_DIR, 'scratch', 'whisprs_flow_video5_connected.ass');

export async function produceFlowWhisprsConnectedVideo5(params = {}) {
  const jobId = params.job_id || 'whisprs_flow_video5_master';

  // 5 Google Flow scenes calibrated to the continuous speech delivery (Total: 18.50s)
  const scenes = [
    {
      file: path.join(FLOW_DIR, 'scene-06.jpeg'), // Overcast Field Silhouette
      dur: 1.80,
      zoom: "min(1.0+0.0006*on,1.12)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)+0.05*on"
    },
    {
      file: path.join(FLOW_DIR, 'scene-07.jpeg'), // Subway Platform Solitude
      dur: 3.10,
      zoom: "min(1.02+0.0005*on,1.12)",
      x: "iw/2-(iw/zoom/2)+0.15*on",
      y: "ih/2-(ih/zoom/2)"
    },
    {
      file: path.join(FLOW_DIR, 'scene-08.jpeg'), // Rainy Window Glow
      dur: 3.90,
      zoom: "min(1.04+0.0006*on,1.14)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)-0.08*on"
    },
    {
      file: path.join(FLOW_DIR, 'scene-09.jpeg'), // Dusk Pier Reflection
      dur: 3.00,
      zoom: "max(1.12-0.0005*on,1.03)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)-0.10*on"
    },
    {
      file: path.join(FLOW_DIR, 'scene-10.jpeg'), // Train Car Quiet
      dur: 6.70, // Includes 2.3s lingering outro piano
      zoom: "max(1.14-0.0004*on,1.02)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)+0.08*on"
    }
  ];

  const totalDuration = scenes.reduce((sum, s) => sum + s.dur, 0); // 18.50s
  console.log(`\n======================================================`);
  console.log(`[Whisprs Flow 100% Sync Engine] STARTING CONNECTED RENDER: ${jobId}`);
  console.log(`Voice Studio Cloned Voice: 'whisper' (Profile 2418c327)`);
  console.log(`Cadence Rules: No hard punctuation, lowercase only, suspended pauses`);
  console.log(`Total Scenes: ${scenes.length}`);
  console.log(`Total Duration: ${totalDuration.toFixed(2)}s`);
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

  const mp4Path = path.join(OUTPUT_DIR, `${jobId}.mp4`);
  const thumbPath = path.join(OUTPUT_DIR, `${jobId}_thumb.jpg`);

  const ffmpegCmd = [
    'ffmpeg', '-y',
    ...inputArgs,
    '-filter_complex', `"${filterStr}"`,
    '-map', '"[vout]"',
    '-map', '"[aout]"',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-t', totalDuration.toFixed(2),
    `"${mp4Path}"`
  ].join(' ');

  console.log(`Executing FFmpeg render...`);
  const startTime = Date.now();
  execSync(ffmpegCmd, { stdio: 'inherit', shell: 'powershell.exe' });
  const renderTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Extract master thumbnail at 6.0s (Scene 3 - Rainy Window Glow)
  execSync(`ffmpeg -y -ss 00:00:06.00 -i "${mp4Path}" -vframes 1 -q:v 2 "${thumbPath}"`, { stdio: 'ignore' });

  // Also mirror to whisprs_flow_video5_connected.mp4 for dedicated reference
  const connectedMp4 = path.join(OUTPUT_DIR, 'whisprs_flow_video5_connected.mp4');
  fs.copyFileSync(mp4Path, connectedMp4);

  console.log(`Render complete in ${renderTime}s: ${mp4Path}`);
  return {
    job_id: jobId,
    duration_seconds: totalDuration,
    mp4_path: mp4Path,
    connected_mp4: connectedMp4,
    thumbnail_path: thumbPath,
    stream_url: `http://localhost:5055/stream/${jobId}.mp4`,
    connected_stream_url: `http://localhost:5055/stream/whisprs_flow_video5_connected.mp4`
  };
}

produceFlowWhisprsConnectedVideo5()
  .then(res => console.log('Successfully completed connected video production:', JSON.stringify(res, null, 2)))
  .catch(err => {
    console.error('Render error:', err);
    process.exit(1);
  });
