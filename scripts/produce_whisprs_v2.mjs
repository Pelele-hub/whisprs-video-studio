// produce_whisprs_v2.mjs - Whisprs Studio V2 Autonomous Engine
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const VISUALS_V2_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'v2');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const JOBS_DIR = path.join(ROOT_DIR, 'jobs');

// Voice & Music paths
const VOICE_PATH = 'C:/Users/majji/OneDrive/Desktop/whisprs_voice_samples/facebook_reel_vocals_isolated.wav';
const MUSIC_PATH = 'C:/Users/majji/OneDrive/Desktop/music/Breathe_and_Allow_Things_to_Pass_denoised.wav';

// Ensure directories
[OUTPUT_DIR, JOBS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

export async function produceVideoV2(jobRequest = {}) {
  const jobId = jobRequest.job_id || `job_v2_${Date.now()}`;
  const jobDir = path.join(JOBS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`[Whisprs Studio V2] STARTING PRODUCTION: ${jobId}`);
  console.log(`======================================================\n`);

  // Measure Voice Duration
  const durOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${VOICE_PATH}"`,
    { encoding: 'utf-8' }
  );
  const voiceDuration = parseFloat(durOutput.trim());
  console.log(`[Whisprs Studio V2] Voice Duration: ${voiceDuration.toFixed(2)}s`);

  // Subtitles in ASS format matching the exact original transcript
  const assPath = path.join(jobDir, 'subtitles.ass');
  const assContent = `[Script Info]
Title: Whisprs V2 Authentic Subtitles
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
Dialogue: 0,0:00:00.50,0:00:02.30,WhisprsItalic,,0,0,0,,{\\i1}Just because you took longer
Dialogue: 0,0:00:02.30,0:00:04.20,WhisprsItalic,,0,0,0,,{\\i1}than others...\\Ndoesn't mean you failed.
Dialogue: 0,0:00:04.30,0:00:06.50,WhisprsItalic,,0,0,0,,{\\i1}Some paths are meant
Dialogue: 0,0:00:06.50,0:00:08.50,WhisprsItalic,,0,0,0,,{\\i1}to be taken slowly.
Dialogue: 0,0:00:08.60,0:00:10.70,WhisprsItalic,,0,0,0,,{\\i1}Some lessons take longer
Dialogue: 0,0:00:10.70,0:00:12.60,WhisprsItalic,,0,0,0,,{\\i1}to understand.
Dialogue: 0,0:00:12.70,0:00:14.80,WhisprsItalic,,0,0,0,,{\\i1}You're still growing,
Dialogue: 0,0:00:14.80,0:00:16.80,WhisprsItalic,,0,0,0,,{\\i1}even when it doesn't show.
Dialogue: 0,0:00:16.90,0:00:18.90,WhisprsItalic,,0,0,0,,{\\i1}Keep going...
Dialogue: 0,0:00:18.90,0:00:21.00,WhisprsItalic,,0,0,0,,{\\i1}you're not out of time.
`;
  fs.writeFileSync(assPath, assContent, 'utf-8');

  // Support dynamic scene image paths from Nano Banana or default to local assets
  let effectiveScenes = [];
  if (jobRequest.character_scenes && Array.isArray(jobRequest.character_scenes) && jobRequest.character_scenes.length > 0) {
    effectiveScenes = jobRequest.character_scenes.map(p => path.isAbsolute(p) ? p : path.join(VISUALS_V2_DIR, p));
  } else if (jobRequest.scene_image_paths && Array.isArray(jobRequest.scene_image_paths) && jobRequest.scene_image_paths.length > 0) {
    effectiveScenes = jobRequest.scene_image_paths.map(p => path.isAbsolute(p) ? p : path.join(VISUALS_V2_DIR, p));
  } else {
    effectiveScenes = [
      path.join(VISUALS_V2_DIR, 'scene_1_girl_zoom.jpg'),
      path.join(VISUALS_V2_DIR, 'scene_2_guy_door_ignore.jpg'),
      path.join(VISUALS_V2_DIR, 'scene_3_old_man_store.jpg'),
      path.join(VISUALS_V2_DIR, 'scene_4_hooded_curb.jpg'),
      path.join(VISUALS_V2_DIR, 'scene_5_balcony_sunset.jpg')
    ];
  }

  const shotDuration = 4.3; // 4.3s per scene * 5 = 21.5s (matches voice + soft musical outro)
  const totalDuration = shotDuration * effectiveScenes.length;

  console.log(`[Whisprs Studio V2] Shot Duration: ${shotDuration}s | Total Duration: ${totalDuration}s`);

  // Build FFmpeg Filter Complex with Alive Movement (Subpixel drift + Sinusoidal Floating Pan)
  const inputArgs = [];
  effectiveScenes.forEach(fullPath => {
    inputArgs.push('-loop', '1', '-t', (shotDuration + 0.5).toFixed(2), '-i', fullPath);
  });
  inputArgs.push('-i', VOICE_PATH);
  inputArgs.push('-stream_loop', '-1', '-i', MUSIC_PATH);

  let filterStr = '';
  // Subtle organic camera breathing / alive drift for each scene:
  // alternating push-in drift, upward subtle tilt, and gentle left-right drift
  effectiveScenes.forEach((_, idx) => {
    let zoomExpr, xExpr, yExpr;
    if (idx % 5 === 0) {
      // Scene 1: Gentle slow push-in on face
      zoomExpr = "min(1.0+0.0008*on,1.15)";
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)+0.1*on";
    } else if (idx % 5 === 1) {
      // Scene 2: Subtle lateral drift revealing door
      zoomExpr = "min(1.06+0.0004*on,1.14)";
      xExpr = "iw/2-(iw/zoom/2)-0.3*on";
      yExpr = "ih/2-(ih/zoom/2)";
    } else if (idx % 5 === 2) {
      // Scene 3: Gentle slow pull-out from warm shop
      zoomExpr = "max(1.15-0.0006*on,1.04)";
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)-0.15*on";
    } else if (idx % 5 === 3) {
      // Scene 4: Slow cinematic push-in on curb
      zoomExpr = "min(1.02+0.0007*on,1.16)";
      xExpr = "iw/2-(iw/zoom/2)+0.15*on";
      yExpr = "ih/2-(ih/zoom/2)";
    } else {
      // Scene 5: Gentle upward tilt toward sunset horizon
      zoomExpr = "min(1.03+0.0005*on,1.13)";
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)-0.2*on";
    }

    filterStr += `[${idx}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='${zoomExpr}':d=1:x='${xExpr}':y='${yExpr}':s=1080x1920:fps=30,trim=duration=${shotDuration.toFixed(2)}[v${idx}];`;
  });

  const concatInputs = effectiveScenes.map((_, i) => `[v${i}]`).join('');
  const relAss = path.relative(ROOT_DIR, assPath).replace(/\\/g, '/');

  // Concat -> Film Grain -> Vignette -> Burn ASS Subtitles
  filterStr += `${concatInputs}concat=n=${effectiveScenes.length}:v=1:a=0[vcat];`;
  filterStr += `[vcat]noise=alls=8:allf=t+u,vignette=PI/4.3[vfilm];`;
  filterStr += `[vfilm]ass='${relAss}'[vout];`;

  // Audio filter: Voice + Ducked Piano
  const voiceIdx = effectiveScenes.length;
  const musicIdx = effectiveScenes.length + 1;
  const fadeOutStart = (totalDuration - 2.0).toFixed(1);
  filterStr += `[${voiceIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.3,apad=pad_dur=2.0[vpad];`;
  filterStr += `[${musicIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.28,afade=t=in:st=0:d=0.8,afade=t=out:st=${fadeOutStart}:d=2.0[bgm];`;
  filterStr += `[vpad][bgm]amix=inputs=2:duration=first:dropout_transition=2,volume=1.6,alimiter=limit=-0.8dB[aout]`;

  const finalMp4Path = path.join(OUTPUT_DIR, `${jobId}.mp4`);
  const thumbPath = path.join(OUTPUT_DIR, `${jobId}_thumb.jpg`);

  const ffmpegArgs = [
    '-y',
    ...inputArgs,
    '-filter_complex', filterStr,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '44100',
    '-t', totalDuration.toFixed(2),
    finalMp4Path
  ];

  console.log(`[Whisprs Studio V2] Rendering Full HD 1080x1920 video with FFmpeg...`);
  await execFileAsync('ffmpeg', ffmpegArgs, { cwd: ROOT_DIR });

  // Generate thumbnail from Scene 1
  execSync(`ffmpeg -y -ss 00:00:02.0 -i "${finalMp4Path}" -vframes 1 -q:v 2 "${thumbPath}"`);

  console.log(`\n======================================================`);
  console.log(`[Whisprs Studio V2] PRODUCTION COMPLETED!`);
  console.log(`Video File: ${finalMp4Path}`);
  console.log(`Thumbnail:  ${thumbPath}`);
  console.log(`======================================================\n`);

  // Also copy to Desktop so the user can easily access it
  const desktopOut = `C:/Users/majji/OneDrive/Desktop/whisprs_voice_samples/${jobId}.mp4`;
  try {
    fs.copyFileSync(finalMp4Path, desktopOut);
    console.log(`Copied to Desktop: ${desktopOut}`);
  } catch(e) {}

  return {
    job_id: jobId,
    title: jobRequest.title || "You're Not Out of Time",
    hook: jobRequest.hook || "Just because you took longer than others...",
    script: "Just because you took longer than others, doesn't mean you failed. Some paths are meant to be taken slowly. Some lessons take longer to understand. You're still growing, even when it doesn't show. Keep going... you're not out of time.",
    duration_seconds: totalDuration,
    caption: `Just because you took longer than others, doesn't mean you failed 🥀🖤\n\nOriginal Poem by Whisprs\n\n"Some paths are meant to be taken slowly. Some lessons take longer to understand. You're still growing, even when it doesn't show. Keep going... you're not out of time."\n\nFollow @Whisprs for quiet reminders and late-night thoughts. 🖤\n\n#whisprs #poetry #quotes #deepthoughts #reels #solitude`,
    hashtags: ["#whisprs", "#poetry", "#quotes", "#deepthoughts", "#reels", "#solitude", "#healing"],
    artifacts: {
      video_mp4: finalMp4Path,
      thumbnail_jpg: thumbPath,
      desktop_mp4: desktopOut
    }
  };
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('produce_whisprs_v2.mjs')) {
  produceVideoV2().catch(err => {
    console.error('[Whisprs Studio V2] Production Error:', err);
    process.exit(1);
  });
}
