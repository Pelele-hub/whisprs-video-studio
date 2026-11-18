// generate_brand_new_v2.mjs - Production Engine for Brand New Whisprs Video V2
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

// Audio paths
const VOICE_PATH = path.join(JOBS_DIR, 'dynamic_run_01', 'narration.mp3');
const MUSIC_PATH = 'C:/Users/majji/OneDrive/Desktop/music/Breathe_and_Allow_Things_to_Pass_denoised.wav';

export async function runNewProduction() {
  const timestamp = Date.now();
  const jobId = `job_v2_new_${timestamp}`;
  const jobDir = path.join(JOBS_DIR, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`[Whisprs V2 Dynamic Engine] INITIATING BRAND NEW VIDEO`);
  console.log(`Job ID: ${jobId}`);
  console.log(`======================================================\n`);

  // 1. Measure voice duration
  const durOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${VOICE_PATH}"`,
    { encoding: 'utf-8' }
  );
  const voiceDuration = parseFloat(durOutput.trim());
  const lingeringOutro = 1.94;
  const totalDuration = voiceDuration + lingeringOutro; // ~24.0s
  console.log(`[Whisprs V2] Voice Duration: ${voiceDuration.toFixed(2)}s | Total Video: ${totalDuration.toFixed(2)}s`);

  // 2. Format ASS Subtitles with exact Whisprs aesthetic
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
Dialogue: 0,0:00:00.10,0:00:03.65,WhisprsItalic,,0,0,0,,{\\i1}You don't always need\\Nto explain your quiet.
Dialogue: 0,0:00:03.70,0:00:07.65,WhisprsItalic,,0,0,0,,{\\i1}Some days...\\Njust making it through is enough.
Dialogue: 0,0:00:07.70,0:00:11.10,WhisprsItalic,,0,0,0,,{\\i1}You carry things\\Nnobody ever asks about...
Dialogue: 0,0:00:11.15,0:00:14.60,WhisprsItalic,,0,0,0,,{\\i1}healing from things\\Nnobody ever apologized for.
Dialogue: 0,0:00:14.65,0:00:17.95,WhisprsItalic,,0,0,0,,{\\i1}Be gentle with\\Nyour tired heart tonight.
Dialogue: 0,0:00:18.00,0:00:22.00,WhisprsItalic,,0,0,0,,{\\i1}You are surviving...\\Nand that is more than enough.
`;
  fs.writeFileSync(assPath, assContent, 'utf-8');

  // 3. Four Newly Generated Scenes
  const sceneFiles = [
    'scene_1_street_rain.jpg',
    'scene_2_train_window.jpg',
    'scene_3_room_window.jpg',
    'scene_4_dawn.jpg'
  ];

  const shotDuration = totalDuration / sceneFiles.length; // 6.0s per shot
  console.log(`[Whisprs V2] Shot Duration: ${shotDuration.toFixed(2)}s per scene (${sceneFiles.length} scenes)`);

  // Build FFmpeg Input Args
  const inputArgs = [];
  sceneFiles.forEach(file => {
    inputArgs.push('-loop', '1', '-t', (shotDuration + 0.5).toFixed(2), '-i', path.join(DYN_VISUALS_DIR, file));
  });
  inputArgs.push('-i', VOICE_PATH);
  inputArgs.push('-stream_loop', '-1', '-i', MUSIC_PATH);

  // Build Filter Complex for Organic Ken Burns Movement
  let filterStr = '';
  sceneFiles.forEach((_, idx) => {
    let zoomExpr, xExpr, yExpr;
    if (idx === 0) {
      // Scene 1 (Rainy street): Gentle push-in toward the lantern glow
      zoomExpr = "min(1.0+0.0007*on,1.14)";
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)+0.08*on";
    } else if (idx === 1) {
      // Scene 2 (Train window): Subtle lateral pan along the rainy window
      zoomExpr = "min(1.05+0.0004*on,1.13)";
      xExpr = "iw/2-(iw/zoom/2)-0.25*on";
      yExpr = "ih/2-(ih/zoom/2)";
    } else if (idx === 2) {
      // Scene 3 (Quiet bedroom): Gentle slow pull-out into room
      zoomExpr = "max(1.14-0.0006*on,1.03)";
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)-0.12*on";
    } else {
      // Scene 4 (Dawn horizon): Slow upward tilt toward the golden sunrise
      zoomExpr = "min(1.02+0.0006*on,1.14)";
      xExpr = "iw/2-(iw/zoom/2)";
      yExpr = "ih/2-(ih/zoom/2)-0.22*on";
    }

    filterStr += `[${idx}:v]scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,crop=1080:1920,setsar=1,zoompan=z='${zoomExpr}':d=1:x='${xExpr}':y='${yExpr}':s=1080x1920:fps=30,setsar=1,trim=duration=${shotDuration.toFixed(2)}[v${idx}];`;
  });

  const concatInputs = sceneFiles.map((_, i) => `[v${i}]`).join('');
  const relAss = path.relative(ROOT_DIR, assPath).replace(/\\/g, '/');

  // Concat -> Film Grain -> Vignette -> Burn ASS Subtitles
  filterStr += `${concatInputs}concat=n=${sceneFiles.length}:v=1:a=0[vcat];`;
  filterStr += `[vcat]noise=alls=8:allf=t+u,vignette=PI/4.3[vfilm];`;
  filterStr += `[vfilm]ass='${relAss}'[vout];`;

  // Audio filter: Voice + Ducked Piano
  const voiceIdx = sceneFiles.length;
  const musicIdx = sceneFiles.length + 1;
  const fadeOutStart = (totalDuration - 2.0).toFixed(1);
  filterStr += `[${voiceIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.35,apad=pad_dur=2.0[vpad];`;
  filterStr += `[${musicIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.28,afade=t=in:st=0:d=1.0,afade=t=out:st=${fadeOutStart}:d=2.0[bgm];`;
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

  console.log(`[Whisprs V2] Rendering 1080x1920 video with FFmpeg...`);
  await execFileAsync('ffmpeg', ffmpegArgs, { cwd: ROOT_DIR });

  // Generate thumbnail from Scene 1
  execSync(`ffmpeg -y -ss 00:00:02.0 -i "${finalMp4Path}" -vframes 1 -q:v 2 "${thumbPath}"`);

  console.log(`\n======================================================`);
  console.log(`[Whisprs V2] PRODUCTION COMPLETED!`);
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
    title: "The Things You Kept to Yourself",
    hook: "You don't always need to explain your quiet.",
    script: "You don't always need to explain your quiet. Some days, just making it through is enough. You carry things nobody ever asks about... healing from things nobody ever apologized for. Be gentle with your tired heart tonight. You are surviving... and that is more than enough.",
    duration_seconds: totalDuration,
    scenes: sceneFiles,
    caption: `You don't always need to explain your quiet. 🥀🖤\n\nSome days, just making it through is enough. You carry things nobody ever asks about, healing from things nobody ever apologized for. Be gentle with your tired heart tonight. You are surviving... and that is more than enough.\n\nFollow @Whisprs for quiet reminders and late-night thoughts. 🖤\n\n#whisprs #poetry #quotes #healing #mentalhealth #solitude #reels`,
    hashtags: ["#whisprs", "#poetry", "#quotes", "#healing", "#mentalhealth", "#solitude", "#reels"],
    artifacts: {
      video_mp4: finalMp4Path,
      thumbnail_jpg: thumbPath,
      desktop_mp4: desktopOut
    }
  };
}

if (process.argv[1] && process.argv[1].endsWith('generate_brand_new_v2.mjs')) {
  runNewProduction().catch(err => {
    console.error('[Whisprs V2 Dynamic Engine] Error:', err);
    process.exit(1);
  });
}
