// produce_authentic_v2.mjs - Whisprs Production with Authentic Original Voice & Pristine High-Res Visuals
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const JOBS_DIR = path.join(ROOT_DIR, 'jobs');
const DYN_VISUALS_DIR = path.join(ROOT_DIR, 'assets', 'visuals', 'dynamic_v2');
const BASE_VISUALS_DIR = path.join(ROOT_DIR, 'assets', 'visuals');

// The EXACT authentic human voice from the original reference video
const VOICE_PATH = 'C:/Users/majji/OneDrive/Desktop/whisprs_voice_samples/facebook_reel_vocals_isolated.wav';
const MUSIC_PATH = 'C:/Users/majji/OneDrive/Desktop/music/Breathe_and_Allow_Things_to_Pass_denoised.wav';

export async function runAuthenticProduction() {
  const timestamp = Date.now();
  const jobId = `job_v2_authentic_${timestamp}`;
  const jobDir = path.join(JOBS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`[Whisprs Authentic Studio] INITIATING MASTER PRODUCTION`);
  console.log(`Job ID: ${jobId}`);
  console.log(`Voice: Authentic Isolated Original Narrator Vocal`);
  console.log(`======================================================\n`);

  // 1. Measure voice duration
  const durOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${VOICE_PATH}"`,
    { encoding: 'utf-8' }
  );
  const voiceDuration = parseFloat(durOutput.trim()); // 20.92s
  const totalDuration = 21.6; // Matches voice + soft musical outro
  console.log(`[Whisprs Studio] Voice Duration: ${voiceDuration.toFixed(2)}s | Total: ${totalDuration}s`);

  // 2. Subtitles matching the exact authentic original delivery with Georgia Humanist Italics
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
Dialogue: 0,0:00:18.90,0:00:21.20,WhisprsItalic,,0,0,0,,{\\i1}you're not out of time.
`;
  fs.writeFileSync(assPath, assContent, 'utf-8');

  // 3. Four Newly Selected / Generated High-Definition Scenes (zero low-quality images)
  const sceneImages = [
    path.join(DYN_VISUALS_DIR, 'scene_1_street_rain.jpg'),      // High-res anime noir rainy street (902 KB)
    path.join(DYN_VISUALS_DIR, 'scene_2_train_window.jpg'),     // High-res rainy train window (815 KB)
    path.join(DYN_VISUALS_DIR, 'scene_3_room_window.jpg'),      // High-res quiet bedroom window (797 KB)
    path.join(BASE_VISUALS_DIR, 'whisprs_scene_4_street.jpg')  // High-res uncompressed 1080x1920 night street (357 KB)
  ];

  const shotDuration = totalDuration / sceneImages.length; // 5.4s per scene
  console.log(`[Whisprs Studio] Shot Duration: ${shotDuration.toFixed(2)}s per scene`);

  // Build FFmpeg Input Args
  const inputArgs = [];
  sceneImages.forEach(imgPath => {
    inputArgs.push('-loop', '1', '-t', (shotDuration + 0.5).toFixed(2), '-i', imgPath);
  });
  inputArgs.push('-i', VOICE_PATH);
  inputArgs.push('-stream_loop', '-1', '-i', MUSIC_PATH);

  // Build Filter Complex for Organic Ken Burns Movement + setsar=1
  let filterStr = '';
  sceneImages.forEach((_, idx) => {
    let zoomExpr, xExpr, yExpr;
    if (idx === 0) {
      // Scene 1: Gentle slow push-in on rainy lantern street
      zoomExpr = "min(1.0+0.0007*on,1.14)";
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)+0.08*on";
    } else if (idx === 1) {
      // Scene 2: Lateral pan along rainy train window
      zoomExpr = "min(1.05+0.0004*on,1.13)";
      xExpr = "iw/2-(iw/zoom/2)-0.25*on";
      yExpr = "ih/2-(ih/zoom/2)";
    } else if (idx === 2) {
      // Scene 3: Gentle slow pull-out into quiet room
      zoomExpr = "max(1.14-0.0006*on,1.03)";
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)-0.12*on";
    } else {
      // Scene 4: Cinematic slow drift down nocturnal street
      zoomExpr = "min(1.02+0.0005*on,1.13)";
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)-0.18*on";
    }

    filterStr += `[${idx}:v]scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1,zoompan=z='${zoomExpr}':d=1:x='${xExpr}':y='${yExpr}':s=1080x1920:fps=30,setsar=1,trim=duration=${shotDuration.toFixed(2)}[v${idx}];`;
  });

  const concatInputs = sceneImages.map((_, i) => `[v${i}]`).join('');
  const relAss = path.relative(ROOT_DIR, assPath).replace(/\\/g, '/');

  // Concat -> 35mm Film Grain -> Vignette -> Burn ASS Subtitles
  filterStr += `${concatInputs}concat=n=${sceneImages.length}:v=1:a=0[vcat];`;
  filterStr += `[vcat]noise=alls=8:allf=t+u,vignette=PI/4.3[vfilm];`;
  filterStr += `[vfilm]ass='${relAss}'[vout];`;

  // Audio filter: Authentic Isolated Vocal + Ducked Denoised Classical Piano
  const voiceIdx = sceneImages.length;
  const musicIdx = sceneImages.length + 1;
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

  console.log(`[Whisprs Studio] Rendering 1080x1920 video with FFmpeg...`);
  await execFileAsync('ffmpeg', ffmpegArgs, { cwd: ROOT_DIR });

  // Generate thumbnail from Scene 1
  execSync(`ffmpeg -y -ss 00:00:02.0 -i "${finalMp4Path}" -vframes 1 -q:v 2 "${thumbPath}"`);

  console.log(`\n======================================================`);
  console.log(`[Whisprs Studio] AUTHENTIC PRODUCTION COMPLETED!`);
  console.log(`Video File: ${finalMp4Path}`);
  console.log(`Thumbnail:  ${thumbPath}`);
  console.log(`======================================================\n`);

  // Copy to Desktop
  const desktopOut = `C:/Users/majji/OneDrive/Desktop/whisprs_voice_samples/${jobId}.mp4`;
  try {
    fs.copyFileSync(finalMp4Path, desktopOut);
    console.log(`Copied to Desktop: ${desktopOut}`);
  } catch(e) {
    console.warn('Desktop copy warning:', e.message);
  }

  return {
    job_id: jobId,
    duration_seconds: totalDuration,
    artifacts: {
      video_mp4: finalMp4Path,
      thumbnail_jpg: thumbPath,
      desktop_mp4: desktopOut
    }
  };
}

if (process.argv[1] && process.argv[1].endsWith('produce_authentic_v2.mjs')) {
  runAuthenticProduction().catch(err => {
    console.error('[Whisprs Authentic Studio] Error:', err);
    process.exit(1);
  });
}
