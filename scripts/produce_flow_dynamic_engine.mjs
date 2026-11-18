// produce_flow_dynamic_engine.mjs - Full Dynamic Engine with Pause-Disappear & Fresh Speech
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = 'C:/Users/majji/whisprs_video_studio';
const OUTPUT_DIR = path.join(ROOT_DIR, 'output');
const SCRATCH_DIR = path.join(ROOT_DIR, 'scratch');
const MUSIC_PATH = 'C:/Users/majji/OneDrive/Desktop/music/Breathe_and_Allow_Things_to_Pass_denoised.wav';
const SAYINGS_FILE = path.join(SCRATCH_DIR, 'sayings_history.json');
const USED_SAYINGS_FILE = path.join(SCRATCH_DIR, 'used_sayings_log.json');
const CONFIG_DIR = path.join(ROOT_DIR, 'config');
const IMAGE_PROMPTS_FILE = path.join(CONFIG_DIR, 'image_prompts.json');
const PYTHON_EXEC = 'C:/Users/majji/.cache/watch/whisperx-venv/Scripts/python.exe';

export const IMAGE_PROMPTS_CATALOG = JSON.parse(fs.readFileSync(IMAGE_PROMPTS_FILE, 'utf-8'));

export function getImagePrompt(idOrKey) {
  return IMAGE_PROMPTS_CATALOG.find(p => p.id === idOrKey || p.key === idOrKey || p.title.toLowerCase() === String(idOrKey).toLowerCase());
}

export function getRandomImagePrompts(count = 5) {
  const shuffled = [...IMAGE_PROMPTS_CATALOG].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export const VERSES_CATALOG = [
  {
    title: "Not All Storms Come to Disrupt Your Life",
    hook: "Not all storms come to disrupt your life.",
    category: "Patience & Acceptance",
    sentences: [
      "Not all storms come to disrupt your life.",
      "Some come to clear your path.",
      "What you lost was making room for what you need.",
      "Trust the timing of your life.",
      "You are exactly where you are meant to be."
    ]
  },
  {
    title: "The Bravest Thing Tonight",
    hook: "Sometimes the bravest thing you can do is just rest.",
    category: "Rest & Solitude",
    sentences: [
      "Sometimes the bravest thing you can do is just rest.",
      "You don't have to carry the whole world on your shoulders.",
      "Let yourself breathe tonight.",
      "You are doing so much better than you realize."
    ]
  },
  {
    title: "Not Every Season Is For Blooming",
    hook: "Not every season is meant for blooming.",
    category: "Quiet Growth",
    sentences: [
      "Not every season is meant for blooming.",
      "Some seasons are just for staying rooted through the cold.",
      "You are still growing in the dark.",
      "Be proud of how far you've come."
    ]
  },
  {
    title: "Permission to Pause",
    hook: "Give yourself permission to pause.",
    category: "Healing",
    sentences: [
      "Give yourself permission to pause.",
      "It is okay if today was heavy.",
      "Tomorrow is a quiet blank page waiting for you.",
      "Rest your mind tonight."
    ]
  },
  {
    title: "The Armor You Can Finally Drop",
    hook: "It's late, and the world is finally quiet.",
    category: "Late Night Solitude",
    sentences: [
      "It's late, and the world is finally quiet.",
      "If nobody told you today, you did good.",
      "Take off the heavy armor.",
      "Tonight, you don't have to prove anything to anyone.",
      "You're going to be okay."
    ]
  }
];

export function getNextUnusedVerse(customText = null) {
  let used = [];
  if (fs.existsSync(USED_SAYINGS_FILE)) {
    try {
      used = JSON.parse(fs.readFileSync(USED_SAYINGS_FILE, 'utf-8'));
    } catch (e) { used = []; }
  }

  if (customText) {
    return {
      title: "Custom Whisprs Verse",
      hook: customText.split(/[.!?]/)[0] + ".",
      category: "Healing & Solitude",
      sentences: customText.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
    };
  }

  const unused = VERSES_CATALOG.filter(v => !used.includes(v.title));
  const selected = unused.length > 0 ? unused[0] : VERSES_CATALOG[Math.floor(Math.random() * VERSES_CATALOG.length)];

  used.push(selected.title);
  fs.writeFileSync(USED_SAYINGS_FILE, JSON.stringify(used, null, 2), 'utf-8');
  return selected;
}

export function synthesizeFreshSpeech(sentences, outWavPath) {
  const fullText = sentences.join(' ');
  const tmpMp3 = outWavPath.replace('.wav', '.mp3');
  console.log(`[Dynamic Voice] Synthesizing fresh speech: "${fullText}"`);

  execSync(`uvx edge-tts --voice en-US-ChristopherNeural --rate -12% --pitch -2Hz --text "${fullText}" --write-media "${tmpMp3}"`, { stdio: 'inherit' });
  execSync(`ffmpeg -y -i "${tmpMp3}" -ar 24000 -ac 1 "${outWavPath}"`, { stdio: 'ignore' });
  if (fs.existsSync(tmpMp3)) fs.unlinkSync(tmpMp3);

  console.log(`[Dynamic Voice] Speech written: ${outWavPath}`);
}

export function buildPauseDisappearAss(alignmentResult, assPath, totalDuration) {
  const assHeader = `[Script Info]
Title: Whisprs Flow Dynamic - Pause-Disappear Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: None
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: WhisprsItalic,Georgia,50,&H00FFFFFF,&H0000FFFF,&H80000000,&H90000000,0,1,0,0,100,100,0.8,0,1,1.2,2.5,2,80,80,920,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  function formatAssTime(sec) {
    const s = Math.max(0, sec);
    const m = Math.floor(s / 60);
    const rem = (s % 60).toFixed(2);
    const [ss, cs] = rem.split('.');
    return `0:${m.toString().padStart(2, '0')}:${ss.padStart(2, '0')}.${cs}`;
  }

  const events = [];
  alignmentResult.segments.forEach(seg => {
    const startStr = formatAssTime(seg.start);
    // Disappear immediately at the end of the spoken words (+ 0.08s buffer)
    const endStr = formatAssTime(seg.end + 0.08);

    // Format text with clean line break if more than 3 words
    const words = seg.text.trim().split(/\s+/);
    let formattedText = seg.text.trim();
    if (words.length > 3) {
      const mid = Math.ceil(words.length / 2);
      formattedText = words.slice(0, mid).join(' ') + '\\N' + words.slice(mid).join(' ');
    }

    events.push(`Dialogue: 0,${startStr},${endStr},WhisprsItalic,,0,0,0,,{\\i1}${formattedText}`);
  });

  const content = assHeader + events.join('\n') + '\n';
  fs.writeFileSync(assPath, content, 'utf-8');
  console.log(`[Subtitles] Pause-Disappear ASS saved: ${assPath}`);
  return events;
}
