// produce_10_whisprs_reels.mjs - Master Batch Production Engine for 10 Whisprs Reels
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const SCRATCH_DIR = path.join(ROOT_DIR, 'scratch');
const AUDIO_DIR = path.join(ROOT_DIR, 'audio');
const REGISTRY_PATH = path.join(ROOT_DIR, 'config', 'whisprs_used_registry.json');
const MUSIC_PATH = path.join(AUDIO_DIR, 'snowfall_curated_25s.wav');

// Auto-load .env
const envPath = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = (match[2] || '').trim().replace(/\r$/, '');
    }
  }
}

export const REELS = [
  {
    id: "whisprs_batch10_reel_01",
    title: "The Quiet Within",
    hook: "not everything that feels lost is truly gone",
    raw_audio: path.join(AUDIO_DIR, "whisprs_batch10_reel_01_raw.wav"),
    scenes: [
      "C:/Users/majji/flow-mcp-out/WhisprsVideo6/scene-01.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo6/scene-02.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo6/scene-03.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo6/scene-04.jpeg"
    ],
    phrases: [
      "not everything that feels lost is truly gone",
      "sometimes the quiet is just making room for you to breathe",
      "you don't have to explain why you are silent tonight",
      "just let the world spin without you - you are safe here"
    ]
  },
  {
    id: "whisprs_batch10_reel_02",
    title: "Put The Shield Down",
    hook: "you have been strong for so long that you forgot how to rest",
    raw_audio: path.join(AUDIO_DIR, "whisprs_v6_speech2_clean_raw.wav"),
    scenes: [
      "C:/Users/majji/flow-mcp-out/WhisprsVideo7/scene-01.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo7/scene-02.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo7/scene-03.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo7/scene-04.jpeg"
    ],
    phrases: [
      "you have been strong for so long that you forgot how to rest",
      "it is okay to put the heavy shield down",
      "nobody is expecting you to hold the sky up by yourself",
      "tonight forgive yourself for being human - tomorrow is a new beginning"
    ]
  },
  {
    id: "whisprs_batch10_reel_03",
    title: "Your Own Rhythm",
    hook: "you are not behind in life",
    raw_audio: path.join(AUDIO_DIR, "whisprs_batch10_reel_03_raw.wav"),
    scenes: [
      "C:/Users/majji/flow-mcp-out/WhisprsVideo2/scene-01.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo2/scene-02.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo2/scene-03.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo2/scene-04.jpeg"
    ],
    phrases: [
      "you are not behind in life - you are simply on your own clock",
      "the moon does not race the sun to prove its light",
      "be patient with the quiet seasons of your growth",
      "walk gently - let time carry what you were never meant to rush"
    ]
  },
  {
    id: "whisprs_batch10_reel_04",
    title: "Gentle With Yourself",
    hook: "give yourself permission to pause",
    raw_audio: path.join(AUDIO_DIR, "whisprs_batch10_reel_04_raw.wav"),
    scenes: [
      "C:/Users/majji/flow-mcp-out/WhisprsVideo3/scene-01.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo3/scene-02.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo3/scene-03.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo3/scene-04.jpeg"
    ],
    phrases: [
      "give yourself permission to pause",
      "it is okay if today felt heavier than usual",
      "you do not have to figure out everything tonight",
      "soften your shoulders - close your eyes - you made it through"
    ]
  },
  {
    id: "whisprs_batch10_reel_05",
    title: "Still Growing",
    hook: "not every season is meant for blooming",
    raw_audio: path.join(AUDIO_DIR, "whisprs_batch10_reel_05_raw.wav"),
    scenes: [
      "C:/Users/majji/flow-mcp-out/WhisprsVideo4/scene-01.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo4/scene-02.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo4/scene-03.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo4/scene-04.jpeg"
    ],
    phrases: [
      "not every season is meant for blooming",
      "some seasons are just for staying rooted through the cold",
      "even in the quiet dark - you are still growing",
      "be proud of how far you've come - rest your tired heart tonight"
    ]
  },
  {
    id: "whisprs_batch10_reel_06",
    title: "Let It Be Enough",
    hook: "some days just making it to the night is a victory",
    raw_audio: path.join(AUDIO_DIR, "whisprs_batch10_reel_06_raw.wav"),
    scenes: [
      "C:/Users/majji/flow-mcp-out/WhisprsVideo5/scene-06.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo5/scene-07.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo5/scene-08.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsVideo5/scene-09.jpeg"
    ],
    phrases: [
      "some days just making it to the night is a victory",
      "you don't always need a lesson from the ache",
      "sometimes surviving is more than enough",
      "let go of the expectations - sleep peacefully tonight"
    ]
  },
  {
    id: "whisprs_batch10_reel_07",
    title: "Doubt and Stillness",
    hook: "do not let the quiet hours convince you that you are alone",
    raw_audio: path.join(AUDIO_DIR, "whisprs_batch10_reel_07_raw.wav"),
    scenes: [
      "C:/Users/majji/flow-mcp-out/WhisprsClonedFlow/scene-02.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsClonedFlow/scene-03.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsClonedFlow/scene-04.jpeg",
      "C:/Users/majji/flow-mcp-out/WhisprsClonedFlow/scene-05.jpeg"
    ],
    phrases: [
      "do not let the quiet hours convince you that you are alone",
      "the world is loud - but your peace is sacred",
      "breathe in the stillness of this moment",
      "you are worthy of rest - even when nothing is finished"
    ]
  },
  {
    id: "whisprs_batch10_reel_08",
    title: "Gentle Waters",
    hook: "even the deepest ocean is calm beneath the surface",
    raw_audio: path.join(AUDIO_DIR, "whisprs_batch10_reel_08_raw.wav"),
    scenes: [
      "C:/Users/majji/whisprs_video_studio/assets/visuals/dynamic_v2/scene_1_street_rain.jpg",
      "C:/Users/majji/whisprs_video_studio/assets/visuals/dynamic_v2/scene_2_train_window.jpg",
      "C:/Users/majji/whisprs_video_studio/assets/visuals/dynamic_v2/scene_3_room_window.jpg",
      "C:/Users/majji/whisprs_video_studio/assets/visuals/dynamic_v2/scene_4_dawn_horizon.jpg"
    ],
    phrases: [
      "even the deepest ocean is calm beneath the surface",
      "the storms above will pass - they always do",
      "let your mind settle like still water tonight",
      "there is nothing to fight here - you are completely at peace"
    ]
  },
  {
    id: "whisprs_batch10_reel_09",
    title: "Unspoken Grace",
    hook: "you have survived every hard day that came before this one",
    raw_audio: path.join(AUDIO_DIR, "whisprs_batch10_reel_09_raw.wav"),
    scenes: [
      "C:/Users/majji/whisprs_video_studio/assets/visuals/v2/scene_1_girl_zoom.jpg",
      "C:/Users/majji/whisprs_video_studio/assets/visuals/v2/scene_2_guy_door_ignore.jpg",
      "C:/Users/majji/whisprs_video_studio/assets/visuals/v2/scene_3_old_man_store.jpg",
      "C:/Users/majji/whisprs_video_studio/assets/visuals/v2/scene_4_hooded_curb.jpg"
    ],
    phrases: [
      "you have survived every hard day that came before this one",
      "and you will make it through this one too",
      "lay your burdens down at the edge of the bed",
      "let sleep find you softly - tomorrow is waiting with new grace"
    ]
  },
  {
    id: "whisprs_batch10_reel_10",
    title: "The Art of Letting Go",
    hook: "healing begins when you stop trying to fix everything at once",
    raw_audio: path.join(AUDIO_DIR, "whisprs_batch10_reel_10_raw.wav"),
    scenes: [
      "C:/Users/majji/whisprs_video_studio/assets/visuals/whisprs_scene_1_flowers.jpg",
      "C:/Users/majji/whisprs_video_studio/assets/visuals/whisprs_scene_2_balcony.jpg",
      "C:/Users/majji/whisprs_video_studio/assets/visuals/whisprs_scene_3_guitar.jpg",
      "C:/Users/majji/whisprs_video_studio/assets/visuals/whisprs_scene_4_street.jpg"
    ],
    phrases: [
      "healing begins when you stop trying to fix everything at once",
      "some things will mend with time - not effort",
      "trust the quiet unfolding of your journey",
      "rest your thoughts tonight - everything is going to be alright"
    ]
  }
];

function secToAss(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = (seconds % 60).toFixed(2).padStart(5, '0');
  return `${h}:${String(m).padStart(2, '0')}:${s}`;
}

export async function processSingleReel(reel, index) {
  const reelNum = index + 1;
  const jobId = `${reel.id}_${Date.now()}`;
  console.log(`\n======================================================`);
  console.log(`[Batch Master] PROCESSING REEL ${reelNum}/10: "${reel.title}"`);
  console.log(`Job ID: ${jobId}`);
  console.log(`Punctuation: STRICTLY ZERO POINTS / NO PERIODS`);
  console.log(`Voice Speed: 5% Slower (atempo=0.95, pitch preserved)`);
  console.log(`Target Window: 20.0s - 30.0s`);
  console.log(`======================================================\n`);

  if (!fs.existsSync(reel.raw_audio)) {
    throw new Error(`Raw audio file not found: ${reel.raw_audio}`);
  }

  // Step 1: Slow audio by exactly 5% (atempo=0.95, pitch preserved)
  const slowWav = path.join(SCRATCH_DIR, `${reel.id}_slow5.wav`);
  console.log(`[Reel ${reelNum}] 1. Slowing voice down by 5% (atempo=0.95)...`);
  execSync(`ffmpeg -y -i "${reel.raw_audio}" -filter:a "atempo=0.95" "${slowWav}"`, { stdio: 'ignore' });

  // Step 2: Faster-Whisper word-level alignment
  const alignJson = path.join(SCRATCH_DIR, `${reel.id}_align.json`);
  if (!fs.existsSync(alignJson)) {
    console.log(`[Reel ${reelNum}] 2. Running faster-whisper alignment...`);
    const alignCmd = `uv run --python 3.11 --with faster-whisper python "${ROOT_DIR}/scripts/align_audio_file.py" --wav "${slowWav}" --out_json "${alignJson}"`;
    execSync(alignCmd, { stdio: 'inherit' });
  }

  const alignData = JSON.parse(fs.readFileSync(alignJson, 'utf-8'));
  const slowDur = alignData.duration;
  console.log(`[Reel ${reelNum}] Aligned audio duration: ${slowDur.toFixed(2)}s`);

  // Step 3: Audio pacing & ASS subtitle formulation
  // Divide audio into 4 phrase slices using faster-whisper detected segments or proportionate timing
  const segments = alignData.alignment || [];
  let phraseSlices = [];

  if (segments.length >= 4) {
    phraseSlices = segments.slice(0, 4).map(s => ({ start: s.start, end: s.end }));
  } else if (segments.length === 3) {
    // 3 segments, split middle or longest
    phraseSlices = [
      { start: segments[0].start, end: segments[0].end },
      { start: segments[1].start, end: (segments[1].start + segments[1].end) / 2 },
      { start: (segments[1].start + segments[1].end) / 2, end: segments[1].end },
      { start: segments[2].start, end: segments[2].end }
    ];
  } else {
    // fallback proportionate split
    const chunkDur = slowDur / 4;
    for (let i = 0; i < 4; i++) {
      phraseSlices.push({
        start: i * chunkDur,
        end: (i + 1) * chunkDur - 0.05
      });
    }
  }

  // Create paced audio with breathing pauses
  // Pause pattern: 0.8s pre-roll, 0.95s after p1, 1.10s after p2, 1.10s after p3, 3.20s piano outro
  const pauses = [0.95, 1.10, 1.10, 3.20];
  const audioEvents = [];
  let curTime = 0.80;

  // We use sox/ffmpeg or python wave to build paced audio cleanly
  const pacerScript = path.join(SCRATCH_DIR, `${reel.id}_pace_build.py`);
  const pacedWav = path.join(AUDIO_DIR, `${reel.id}_paced.wav`);
  const assPath = path.join(SCRATCH_DIR, `${reel.id}.ass`);

  const pacerPy = `
import wave
import numpy as np

with wave.open(r"${slowWav}", "rb") as f:
    sr = f.getframerate()
    n_ch = f.getnchannels()
    sampwidth = f.getsampwidth()
    raw = f.readframes(f.getnframes())
    audio = np.frombuffer(raw, dtype=np.int16).copy()

slices = ${JSON.stringify(phraseSlices)}
pauses = ${JSON.stringify(pauses)}
phrases = ${JSON.stringify(reel.phrases)}

chunks = []
chunks.append(np.zeros(int(0.80 * sr), dtype=np.int16)) # initial 0.8s silence
cur = 0.80
events = []

for idx, sl in enumerate(slices):
    s_idx = int(sl["start"] * sr)
    e_idx = min(len(audio), int(sl["end"] * sr))
    chunk = audio[s_idx:e_idx].copy()
    c_dur = len(chunk) / sr
    
    # 12ms micro-fade
    flen = int(0.012 * sr)
    if len(chunk) > 2 * flen:
        fi = np.linspace(0.0, 1.0, flen)
        fo = np.linspace(1.0, 0.0, flen)
        chunk[:flen] = (chunk[:flen] * fi).astype(np.int16)
        chunk[-flen:] = (chunk[-flen:] * fo).astype(np.int16)
        
    sp_start = cur
    sp_end = sp_start + c_dur
    events.append({
        "phrase_idx": idx + 1,
        "start": sp_start,
        "end": sp_end,
        "text": phrases[idx].replace(".", "").replace("!", "").replace("?", "").strip()
    })
    
    chunks.append(chunk)
    cur += c_dur
    
    p_dur = pauses[idx]
    if idx == len(slices) - 1:
        # Guarantee final reel duration is between 21.5s and 25.5s (strictly within 20s-30s window)
        target_outro = max(3.20, 22.50 - cur)
        p_dur = min(target_outro, 28.00 - cur)
    chunks.append(np.zeros(int(p_dur * sr), dtype=np.int16))
    cur += p_dur

final_audio = np.concatenate(chunks)
total_dur = len(final_audio) / sr

with wave.open(r"${pacedWav}", "wb") as f:
    f.setnchannels(n_ch)
    f.setsampwidth(sampwidth)
    f.setframerate(sr)
    f.writeframes(final_audio.tobytes())

import json
with open(r"${SCRATCH_DIR}/${reel.id}_events.json", "w", encoding="utf-8") as f:
    json.dump({"total_duration": total_dur, "events": events}, f, indent=2)

print(f"Paced total duration: {total_dur:.2f}s")
`;

  fs.writeFileSync(pacerScript, pacerPy, 'utf-8');
  execSync(`"C:\\Users\\majji\\qwen3_tts_studio\\.venv\\Scripts\\python.exe" "${pacerScript}"`, { stdio: 'inherit' });

  const paceMeta = JSON.parse(fs.readFileSync(path.join(SCRATCH_DIR, `${reel.id}_events.json`), 'utf-8'));
  const totalDuration = paceMeta.total_duration;
  console.log(`[Reel ${reelNum}] Paced Audio: ${pacedWav} | Duration: ${totalDuration.toFixed(2)}s`);

  if (totalDuration < 20.0 || totalDuration > 30.0) {
    throw new Error(`Total duration ${totalDuration.toFixed(2)}s is outside strict 20.0s - 30.0s window!`);
  }

  // Build ASS Subtitle file with ZERO POINTS / NO PERIODS
  let assContent = `[Script Info]
Title: Whisprs Reel ${reelNum} - ${reel.title}
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: WhisprsItalic,Georgia,52,&H00FFFFFF,&H0000FFFF,&H80000000,&H90000000,0,1,0,0,100,100,0.8,0,1,1.2,2.5,2,80,80,920,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  paceMeta.events.forEach(ev => {
    // Strictly lowercase, ZERO points / periods
    const cleanText = ev.text.toLowerCase().replace(/\./g, '').trim();
    const sAss = secToAss(Math.max(0.0, ev.start - 0.05));
    const eAss = secToAss(ev.end + 0.10);
    assContent += `Dialogue: 0,${sAss},${eAss},WhisprsItalic,,0,0,0,,{\\fad(120,80)}${cleanText}\n`;
  });

  fs.writeFileSync(assPath, assContent, 'utf-8');
  console.log(`[Reel ${reelNum}] Subtitle ASS file generated: ${assPath}`);

  // Step 4: Video Rendering with 4 Cinematic Scenes & Ken Burns
  const shotDur = totalDuration / 4;
  const scenes = [
    {
      file: reel.scenes[0],
      dur: shotDur,
      zoom: "min(1.0+0.00045*on,1.10)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)+0.04*on"
    },
    {
      file: reel.scenes[1],
      dur: shotDur,
      zoom: "min(1.02+0.0004*on,1.10)",
      x: "iw/2-(iw/zoom/2)-0.10*on",
      y: "ih/2-(ih/zoom/2)"
    },
    {
      file: reel.scenes[2],
      dur: shotDur,
      zoom: "max(1.10-0.0004*on,1.02)",
      x: "iw/2-(iw/zoom/2)",
      y: "ih/2-(ih/zoom/2)-0.05*on"
    },
    {
      file: reel.scenes[3],
      dur: shotDur,
      zoom: "min(1.01+0.00045*on,1.10)",
      x: "iw/2-(iw/zoom/2)+0.08*on",
      y: "ih/2-(ih/zoom/2)"
    }
  ];

  for (const s of scenes) {
    if (!fs.existsSync(s.file)) {
      throw new Error(`Scene image does not exist: ${s.file}`);
    }
  }

  const finalMp4Path = path.join(OUTPUT_DIR, `${reel.id}.mp4`);
  const thumbPath = path.join(OUTPUT_DIR, `${reel.id}_thumb.jpg`);

  const inputArgs = [];
  scenes.forEach(s => {
    inputArgs.push('-loop', '1', '-t', (s.dur + 0.5).toFixed(2), '-i', s.file);
  });
  inputArgs.push('-i', pacedWav);
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
  const fadeOutStart = (totalDuration - 2.5).toFixed(2);

  filterStr += `[${voiceIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=1.35,apad=pad_dur=3.0[vpad];`;
  filterStr += `[${musicIdx}:a]aformat=sample_rates=44100:channel_layouts=stereo,volume=0.26,afade=t=in:st=0:d=0.8,afade=t=out:st=${fadeOutStart}:d=2.5[bgm];`;
  filterStr += `[vpad][bgm]amix=inputs=2:duration=first:dropout_transition=2,volume=1.55,alimiter=limit=-0.8dB[aout]`;

  const cmd = [
    'ffmpeg', '-y',
    ...inputArgs,
    '-filter_complex', `"${filterStr}"`,
    '-map', '[vout]',
    '-map', '[aout]',
    '-c:v', 'h264_mf', '-b:v', '9M',
    '-c:a', 'aac', '-b:a', '192k',
    '-t', totalDuration.toFixed(2),
    `"${finalMp4Path}"`
  ].join(' ');

  console.log(`[Reel ${reelNum}] Executing FFmpeg Render with Hardware Acceleration (h264_mf)...`);
  execSync(cmd, { stdio: 'inherit' });

  // Thumbnail
  execSync(`ffmpeg -y -ss 00:00:03.00 -i "${finalMp4Path}" -vframes 1 "${thumbPath}"`, { stdio: 'ignore' });
  console.log(`[Reel ${reelNum}] Render COMPLETE! Saved to: ${finalMp4Path}`);

  // Step 5: Log to Single-Use Registry
  let registry = { used_speeches: [], used_images: [], jobs: [] };
  if (fs.existsSync(REGISTRY_PATH)) {
    try {
      registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
    } catch (e) {}
  }

  const scriptFull = reel.phrases.join(' - ');
  registry.used_speeches.push({ job_id: jobId, script: scriptFull, timestamp: new Date().toISOString() });
  reel.scenes.forEach(f => registry.used_images.push({ job_id: jobId, file: f, timestamp: new Date().toISOString() }));
  registry.jobs.push({
    job_id: jobId,
    title: reel.title,
    duration: totalDuration,
    created_at: new Date().toISOString(),
    video_path: finalMp4Path,
    thumbnail_path: thumbPath
  });

  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8');
  console.log(`[Reel ${reelNum}] Single-use assets logged to registry.`);

  return {
    job_id: jobId,
    reel_id: reel.id,
    title: reel.title,
    hook: reel.hook,
    script: scriptFull,
    duration: totalDuration,
    video_path: finalMp4Path,
    thumbnail_path: thumbPath,
    video_filename: path.basename(finalMp4Path),
    thumb_filename: path.basename(thumbPath)
  };
}

export async function produceAll10Reels() {
  console.log(`\n======================================================`);
  console.log(`[Whisprs Production Studio] BATCH 10 REELS RUN`);
  console.log(`======================================================\n`);

  const results = [];
  for (let i = 0; i < REELS.length; i++) {
    const reel = REELS[i];
    try {
      const res = await processSingleReel(reel, i);
      results.push(res);
    } catch (err) {
      console.error(`Error processing reel ${i+1} (${reel.id}):`, err);
      throw err;
    }
  }

  console.log(`\n======================================================`);
  console.log(`ALL 10 WHISPRS REELS SUCCESSFULLY RENDERED!`);
  console.log(`======================================================\n`);
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('produce_10_whisprs_reels.mjs')) {
  produceAll10Reels().then(res => {
    console.log('\nProduction Summary:');
    res.forEach((r, idx) => {
      console.log(`${idx+1}. [${r.title}] Dur: ${r.duration.toFixed(2)}s -> ${r.video_path}`);
    });
  }).catch(err => {
    console.error('Fatal batch render error:', err);
    process.exit(1);
  });
}
