import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = 'C:/Users/majji/whisprs_video_studio';
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const FLOW_DIR = 'C:/Users/majji/flow-mcp-out/WhisprsVideo2';
const VOICE_PATH = 'C:/Users/majji/OneDrive/Desktop/whisprs_voice_samples/facebook_reel_vocals_isolated.wav';
const MUSIC_PATH = 'C:/Users/majji/OneDrive/Desktop/music/Breathe_and_Allow_Things_to_Pass_denoised.wav';
const ASS_PATH = path.join(ROOT_DIR, 'scratch', 'whisprs_flow_video2.ass');

export async function produceFlowWhisprsVideo2(params = {}) {
  const timestamp = Date.now();
  const jobId = params.job_id || `whisprs_flow_video2_master`;

  // 6 distinct scenes: exactly 1 scene per sentence / clause of the narration
  const scenes = [
    {
      file: path.join(FLOW_DIR, 'scene-01.jpeg'), // Solitary traveler on twilight train platform
      dur: 4.39,
      sentence: "Just because you took longer than others doesn't mean you failed.",
      zoom: "min(1.0+0.0005*on,1.12)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)+0.05*on"
    },
    {
      file: path.join(FLOW_DIR, 'scene-02.jpeg'), // Solitary figure walking along winding forest path
      dur: 3.47,
      sentence: "Some paths are meant to be taken slowly.",
      zoom: "min(1.02+0.0004*on,1.12)",
      x: "iw/2-(iw/zoom/2)+0.15*on",
      y: "ih/2-(ih/zoom/2)"
    },
    {
      file: path.join(FLOW_DIR, 'scene-03.jpeg'), // Rainy coffee shop window with warm mug
      dur: 3.46,
      sentence: "Some lessons take longer to understand.",
      zoom: "min(1.04+0.0006*on,1.14)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)-0.08*on"
    },
    {
      file: path.join(FLOW_DIR, 'scene-04.jpeg'), // Stone bridge over reflective nocturnal canal
      dur: 4.58,
      sentence: "You're still growing, even when it doesn't show.",
      zoom: "max(1.12-0.0004*on,1.03)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)-0.12*on"
    },
    {
      file: path.join(FLOW_DIR, 'scene-05.jpeg'), // Walking steadily toward warm amber archway
      dur: 1.97,
      sentence: "Keep going.",
      zoom: "min(1.02+0.0008*on,1.10)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)"
    },
    {
      file: path.join(FLOW_DIR, 'scene-06.jpeg'), // Hilltop overlook at twilight dawn
      dur: 4.63,
      sentence: "You're not out of time.",
      zoom: "max(1.14-0.0005*on,1.02)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)+0.10*on"
    }
  ];

  const totalDuration = scenes.reduce((sum, s) => sum + s.dur, 0); // 22.50s
  console.log(`\n======================================================`);
  console.log(`[Whisprs Flow 100% Sync Engine] STARTING RENDER: ${jobId}`);
  console.log(`Total Scenes: ${scenes.length} (1 scene per sentence)`);
  console.log(`Total Duration: ${totalDuration.toFixed(2)}s`);
  console.log(`======================================================\n`);

  // Verify all image files exist
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
    title: params.title || "Just Because You Took Longer Than Others",
    hook: "Just because you took longer than others doesn't mean you failed.",
    category: "Patience & Growth",
    script: "Just because you took longer than others doesn't mean you failed. Some paths are meant to be taken slowly. Some lessons take longer to understand. You're still growing, even when it doesn't show. Keep going. You're not out of time.",
    duration_seconds: totalDuration,
    scenes_count: scenes.length,
    sync_precision: "100% WhisperX Phoneme/Word-Forced Alignment",
    caption: `Just because you took longer than others doesn't mean you failed. 🖤\n\nSome paths are meant to be taken slowly. You're not out of time.\n\n#whisprs #poetry #growth #patience #deepthoughts #reels #healing`,
    hashtags: ["#whisprs", "#poetry", "#growth", "#patience", "#reels"],
    stream_url: `http://localhost:5055/stream/${jobId}.mp4`,
    artifacts: {
      video_mp4: finalMp4Path,
      thumbnail_jpg: thumbPath,
      subtitles_ass: ASS_PATH
    }
  };
}

// Standalone execution support
if (process.argv[1] && process.argv[1].endsWith('render_flow_whisprs_video2.mjs')) {
  produceFlowWhisprsVideo2({ job_id: 'whisprs_flow_video2_master' })
    .then(res => {
      console.log('Production Succeeded:', res.stream_url);
      process.exit(0);
    })
    .catch(err => {
      console.error('Production Error:', err);
      process.exit(1);
    });
}
