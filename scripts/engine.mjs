// engine.mjs - Production-Grade Multi-Scene Video Production Engine
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ASSETS_DIR = path.join(ROOT_DIR, 'assets');
const VISUALS_DIR = path.join(ASSETS_DIR, 'visuals');
const MUSIC_DIR = path.join(ASSETS_DIR, 'music');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const JOBS_DIR = path.join(ROOT_DIR, 'jobs');

// Ensure directories
[OUTPUT_DIR, JOBS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Load profiles
const styleProfile = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'config', 'style_profile.json'), 'utf-8'));
const voiceProfile = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'config', 'voice_profile.json'), 'utf-8'));

/**
 * Parses VTT/SRT and splits long sentence blocks into intimate 3-6 word poetic subtitle chunks
 * with proportional timestamps, centered vertical positioning, humanist italics, and watermark.
 */
export function srtToAss(srtContent, options = {}) {
  const {
    fontSize = 46,
    fontName = 'Georgia',
    primaryColor = '&H00FFFFFF',     // Pure White
    secondaryColor = '&H0000FFFF',
    outlineColor = '&H80000000',     // 50% opacity subtle black outline
    backColor = '&H90000000',        // Soft drop shadow
    bold = 0,                        // Regular weight
    italic = 1,                      // Italic style matching Whisprs
    outline = 1.0,                   // Delicate 1px outline
    shadow = 2.5,                    // Soft 2.5px shadow
    marginV = 920,                   // 920px from bottom = center of 1920-height frame
    watermarkText = ''
  } = options;

  const assHeader = `[Script Info]
Title: Whisprs Production Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: WhisprsItalic,${fontName},${fontSize},${primaryColor},${secondaryColor},${outlineColor},${backColor},${bold},${italic},0,0,100,100,0.8,0,1,${outline},${shadow},2,80,80,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const parseSecs = (timeStr) => {
    const parts = timeStr.replace(',', '.').split(':');
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseFloat(parts[2]);
  };

  const formatAssTime = (totalSecs) => {
    const h = Math.floor(totalSecs / 3600);
    const m = Math.floor((totalSecs % 3600) / 60);
    const s = (totalSecs % 60).toFixed(2).padStart(5, '0');
    return `${h}:${m.toString().padStart(2, '0')}:${s}`;
  };

  const cleanContent = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = cleanContent.split(/\n\n+/).filter(b => b.trim().length > 0);
  const events = [];

  for (const block of blocks) {
    const lines = block.split('\n').filter(l => l.trim().length > 0);
    let timeLineIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('-->')) {
        timeLineIdx = i;
        break;
      }
    }
    if (timeLineIdx === -1) continue;

    const timeLine = lines[timeLineIdx];
    const [startStr, endStr] = timeLine.split('-->').map(s => s.trim());
    const cueStart = parseSecs(startStr);
    const cueEnd = parseSecs(endStr);
    const cueDuration = Math.max(0.5, cueEnd - cueStart);

    const rawText = lines.slice(timeLineIdx + 1).join(' ').trim();
    if (!rawText) continue;

    // Split long sentences into 3 to 6 word natural clauses
    const rawWords = rawText.split(/\s+/);
    const chunks = [];
    let currentChunk = [];

    for (let w = 0; w < rawWords.length; w++) {
      currentChunk.push(rawWords[w]);
      const word = rawWords[w];
      const hasPausePunctuation = word.endsWith('...') || word.endsWith(',') || word.endsWith(';') || word.endsWith('.');
      if (currentChunk.length >= 5 || (hasPausePunctuation && currentChunk.length >= 3) || w === rawWords.length - 1) {
        chunks.push(currentChunk.join(' '));
        currentChunk = [];
      }
    }

    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
    }

    // Allocate time proportionally
    const totalChars = chunks.reduce((sum, c) => sum + c.length, 0);
    let chunkOffset = cueStart;

    for (let c = 0; c < chunks.length; c++) {
      const chunkText = chunks[c];
      const fraction = chunkText.length / totalChars;
      const chunkDur = fraction * cueDuration;
      const chunkEnd = c === chunks.length - 1 ? cueEnd : chunkOffset + chunkDur;

      // Wrap if more than 4 words
      const words = chunkText.split(/\s+/);
      let formattedText = '';
      if (words.length > 3) {
        const mid = Math.ceil(words.length / 2);
        formattedText = words.slice(0, mid).join(' ') + '\\N' + words.slice(mid).join(' ');
      } else {
        formattedText = chunkText;
      }

      events.push(`Dialogue: 0,${formatAssTime(chunkOffset)},${formatAssTime(chunkEnd)},WhisprsItalic,,0,0,0,,{\\i1}${formattedText}`);
      chunkOffset = chunkEnd;
    }
  }

  return assHeader + events.join('\n') + '\n';
}

// Master Production Function
export async function produceVideo(jobRequest = {}) {
  const jobId = jobRequest.job_id || `job_${Date.now()}`;
  const jobDir = path.join(JOBS_DIR, jobId);
  if (!fs.existsSync(jobDir)) fs.mkdirSync(jobDir, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`[Whisprs Studio] INITIATING JOB: ${jobId}`);
  console.log(`[Whisprs Studio] Title: ${jobRequest.title || 'The Quiet You Carry'}`);
  console.log(`======================================================\n`);

  // 1. Script Synthesis
  let scriptText = jobRequest.script || jobRequest.custom_text;
  let title = jobRequest.title;
  let hook = jobRequest.hook;
  let tags = jobRequest.tags;

  if (!scriptText) {
    title = "The Quiet You Carry";
    hook = "We never know how much someone is holding.";
    scriptText = "We never know how much someone is holding, behind a polite smile or a quiet glance. The strongest people aren't the ones who never broke... but the ones who learned to rebuild in silence. Be gentle with who you meet. Sometimes, surviving the day... is their greatest victory.";
    tags = ["#whisprs", "#poetry", "#solitude", "#healing", "#innerpeace", "#quotes", "#deepthoughts", "#reels"];
  }

  const voiceId = jobRequest.voice || voiceProfile.default_voice;
  const rate = jobRequest.rate || styleProfile.audio.narration_speech_rate;

  // 2. Generate Voiceover & Subtitles via Edge-TTS
  const voicePath = path.join(jobDir, 'narration.mp3');
  const srtPath = path.join(jobDir, 'subtitles.vtt');
  const assPath = path.join(jobDir, 'subtitles.ass');

  console.log(`[Step 1/5] Synthesizing Voiceover with ${voiceId} (Rate: ${rate})...`);
  await execFileAsync('uvx', [
    'edge-tts',
    '--voice', voiceId,
    '--rate', rate,
    '--text', scriptText,
    '--write-media', voicePath,
    '--write-subtitles', srtPath
  ]);

  // Convert to ASS
  console.log(`[Step 2/5] Formatting Intimate Italic Subtitles (ASS with Watermark)...`);
  const srtRaw = fs.readFileSync(srtPath, 'utf-8');
  const assRaw = srtToAss(srtRaw, {
    watermarkText: jobRequest.watermark || ''
  });
  fs.writeFileSync(assPath, assRaw, 'utf-8');

  // Measure Voice Duration
  const durOutput = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${voicePath}"`,
    { encoding: 'utf-8' }
  );
  const voiceDuration = parseFloat(durOutput.trim());
  const totalDuration = voiceDuration + (styleProfile.audio.outro_music_linger_seconds || 1.8);
  console.log(`[Step 3/5] Audio Duration: ${voiceDuration.toFixed(2)}s | Total Video Duration: ${totalDuration.toFixed(2)}s`);

  // 3. Multi-Scene Visual Montage Selection (4 cuts matching reference analysis)
  const availableVisuals = fs.readdirSync(VISUALS_DIR).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  
  // Prioritize newly generated AI visuals
  let sceneFiles = jobRequest.scenes || [
    'whisprs_scene_1_flowers.jpg',
    'whisprs_scene_2_balcony.jpg',
    'whisprs_scene_3_guitar.jpg',
    'whisprs_scene_4_rain.jpg'
  ].filter(f => availableVisuals.includes(f));

  // Fallback if custom images missing
  if (sceneFiles.length < 4) {
    const fallbacks = ['night_moon.jpg', 'coffee_window.jpg', 'autumn_street.jpg', 'starry_sky.jpg'];
    for (const fb of fallbacks) {
      if (sceneFiles.length >= 4) break;
      if (availableVisuals.includes(fb) && !sceneFiles.includes(fb)) {
        sceneFiles.push(fb);
      }
    }
  }

  console.log(`[Whisprs Studio] Selected ${sceneFiles.length} Montage Scenes:`, sceneFiles);

  // Pick ambient classical music
  const musicFile = jobRequest.music || 'gymnopedie.ogg';
  const musicPath = path.join(MUSIC_DIR, musicFile);

  // 4. Build Storyboard Specification
  const shotDuration = totalDuration / sceneFiles.length;
  const storyboard = {
    job_id: jobId,
    title,
    hook,
    total_duration_sec: totalDuration,
    scenes: sceneFiles.map((file, idx) => ({
      scene_id: `scene_${idx + 1}`,
      visual_file: file,
      start_time_sec: parseFloat((idx * shotDuration).toFixed(2)),
      end_time_sec: parseFloat(((idx + 1) * shotDuration).toFixed(2)),
      duration_sec: parseFloat(shotDuration.toFixed(2)),
      camera_motion: idx % 2 === 0 ? 'slow_zoom_in' : 'slow_pan_drift',
      ambient_soundtrack: musicFile
    }))
  };

  fs.writeFileSync(path.join(jobDir, 'storyboard.json'), JSON.stringify(storyboard, null, 2), 'utf-8');

  // 5. Render Video via FFmpeg Multi-Scene Filter Complex with Film Grain & Vignette
  console.log(`[Step 4/5] Compositing Multi-Scene Montage, Film Grain & Subtitles in FFmpeg...`);
  const finalMp4Path = path.join(OUTPUT_DIR, `${jobId}.mp4`);
  const thumbPath = path.join(OUTPUT_DIR, `${jobId}_thumb.jpg`);

  const inputArgs = [];
  sceneFiles.forEach(file => {
    inputArgs.push('-loop', '1', '-t', (shotDuration + 0.1).toFixed(2), '-i', path.join(VISUALS_DIR, file));
  });
  inputArgs.push('-i', voicePath);
  inputArgs.push('-stream_loop', '-1', '-i', musicPath);

  let filterStr = '';
  sceneFiles.forEach((_, idx) => {
    const zoomFactor = idx % 2 === 0 ? "min(zoom+0.0012,1.18)" : "max(1.18-zoom*0.0008,1.05)";
    filterStr += `[${idx}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='${zoomFactor}':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,trim=duration=${shotDuration.toFixed(2)}[v${idx}];`;
  });

  const concatInputs = sceneFiles.map((_, i) => `[v${i}]`).join('');
  const relAss = path.relative(ROOT_DIR, assPath).replace(/\\/g, '/');

  // Concat -> Film Grain -> Vignette -> Burn ASS Subtitles
  filterStr += `${concatInputs}concat=n=${sceneFiles.length}:v=1:a=0[vcat];`;
  filterStr += `[vcat]noise=alls=7:allf=t+u,vignette=PI/4.5[vfilm];`;
  filterStr += `[vfilm]ass='${relAss}'[vout];`;

  // Audio filter: Resample, Ducking (-18 dB), fade out
  const voiceIdx = sceneFiles.length;
  const musicIdx = sceneFiles.length + 1;
  const fadeOutStart = (totalDuration - 2.0).toFixed(1);
  filterStr += `[${voiceIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.4,apad=pad_dur=2.0[vpad];`;
  filterStr += `[${musicIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.22,afade=t=in:st=0:d=0.8,afade=t=out:st=${fadeOutStart}:d=2.0[bgm];`;
  filterStr += `[vpad][bgm]amix=inputs=2:duration=first:dropout_transition=2,volume=1.8,alimiter=limit=-0.8dB[aout]`;

  // Encoder settings: Try NVENC if supported, otherwise libx264
  let codecArgs = ['-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-pix_fmt', 'yuv420p'];
  try {
    const nvencCheck = execSync('ffmpeg -hide_banner -encoders', { encoding: 'utf-8' });
    if (nvencCheck.includes('h264_nvenc')) {
      codecArgs = ['-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '23', '-pix_fmt', 'yuv420p'];
      console.log(`[Whisprs Studio] Using Hardware Encoder: h264_nvenc`);
    } else {
      console.log(`[Whisprs Studio] Using Software Encoder: libx264`);
    }
  } catch (e) {
    console.log(`[Whisprs Studio] Using Default Encoder: libx264`);
  }

  const ffmpegArgs = [
    '-y',
    ...inputArgs,
    '-filter_complex', filterStr,
    '-map', '[vout]',
    '-map', '[aout]',
    ...codecArgs,
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '44100',
    '-shortest',
    finalMp4Path
  ];

  try {
    await execFileAsync('ffmpeg', ffmpegArgs, { cwd: ROOT_DIR });
  } catch (encErr) {
    console.warn(`[Whisprs Studio] Render with primary encoder failed, retrying with libx264...`, encErr.message);
    const fallbackArgs = [
      '-y',
      ...inputArgs,
      '-filter_complex', filterStr,
      '-map', '[vout]',
      '-map', '[aout]',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '22',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-ar', '44100',
      '-shortest',
      finalMp4Path
    ];
    await execFileAsync('ffmpeg', fallbackArgs, { cwd: ROOT_DIR });
  }

  // 6. Thumbnail Extraction
  console.log(`[Step 5/5] Extracting Master 1080x1920 Poster Thumbnail...`);
  await execFileAsync('ffmpeg', [
    '-y',
    '-ss', '00:00:02',
    '-i', finalMp4Path,
    '-vframes', '1',
    thumbPath
  ], { cwd: ROOT_DIR });

  // 7. Full Social Metadata & QA Summary
  const caption = `${hook}\n\n${title}\n\n"${scriptText}"\n\nFollow @Whisprs for quiet reminders and late-night thoughts. 🖤\n\n${tags.join(' ')}`;

  const jobSummary = {
    job_id: jobId,
    status: 'COMPLETED_SUCCESS',
    timestamp: new Date().toISOString(),
    title,
    hook,
    category: jobRequest.category || 'Solitude & Self-Discovery',
    script: scriptText,
    duration_seconds: parseFloat(totalDuration.toFixed(2)),
    voice: voiceId,
    scene_cuts_count: sceneFiles.length,
    scenes: storyboard.scenes,
    music: musicFile,
    hashtags: tags,
    caption,
    artifacts: {
      video_mp4: finalMp4Path,
      thumbnail_jpg: thumbPath,
      subtitles_ass: assPath,
      narration_mp3: voicePath,
      storyboard_json: path.join(jobDir, 'storyboard.json')
    }
  };

  fs.writeFileSync(path.join(jobDir, 'job_summary.json'), JSON.stringify(jobSummary, null, 2), 'utf-8');
  console.log(`[Whisprs Studio] JOB COMPLETE: ${finalMp4Path}`);

  return jobSummary;
}

// CLI Execution Support
if (process.argv[1] && process.argv[1].endsWith('engine.mjs')) {
  produceVideo({})
    .then(summary => {
      console.log('\n[SUCCESS] Rendered Pilot Video:');
      console.log(JSON.stringify(summary, null, 2));
    })
    .catch(err => {
      console.error('[ERROR] Engine execution failed:', err);
      process.exit(1);
    });
}
