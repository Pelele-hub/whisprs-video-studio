import os
import wave
import json
import numpy as np

# Original Cloned Voice (Qwen 0.6B Base Cloned Voice at Normal Speed)
RAW_WAV = "C:/Users/majji/whisprs_video_studio/audio/whisprs_new_qwen06_connected.wav"
OUT_WAV = "C:/Users/majji/whisprs_video_studio/audio/whisprs_cloned_normal_speed_fixed.wav"
ASS_PATH = "C:/Users/majji/whisprs_video_studio/scratch/whisprs_cloned_fixed.ass"
META_JSON = "C:/Users/majji/whisprs_video_studio/scratch/whisprs_cloned_fixed_meta.json"

os.makedirs(os.path.dirname(OUT_WAV), exist_ok=True)
os.makedirs(os.path.dirname(ASS_PATH), exist_ok=True)

with wave.open(RAW_WAV, "rb") as f:
    sr = f.getframerate()
    n_ch = f.getnchannels()
    sampwidth = f.getsampwidth()
    n_frames = f.getnframes()
    raw_bytes = f.readframes(n_frames)
    audio = np.frombuffer(raw_bytes, dtype=np.int16).copy()

print(f"[Pacer Fixed] Loaded Original Cloned Voice: {RAW_WAV} | {sr}Hz | {n_ch}ch | {len(audio)/sr:.2f}s", flush=True)

def to_sample(sec):
    return int(sec * sr)

# Exact phrase cut ranges at NORMAL SPEED (1.0x) - ZERO POINTS / NO PERIODS
phrases = [
    {
        "start": 0.00,
        "end": 2.05,
        "text": "you don't have to carry the weight of everything",
        "pause_after": 0.95
    },
    {
        "start": 2.25,
        "end": 4.35,
        "text": "because some things were never meant to be held",
        "pause_after": 1.10
    },
    {
        "start": 4.55,
        "end": 6.95,
        "text": "and when you feel tired in a world that never stops",
        "pause_after": 1.10
    },
    {
        "start": 7.30,
        "end": 9.50,
        "text": "remember that healing is just learning to breathe",
        "pause_after": 1.10
    },
    {
        "start": 9.85,
        "end": 11.60,
        "text": "so let your heavy thoughts rest",
        "pause_after": 0.95
    },
    {
        "start": 12.10,
        "end": 13.55,
        "text": "tomorrow will be kinder",
        "pause_after": 3.40  # Outro lingering piano solo
    }
]

new_audio_chunks = []
events = []
current_time = 0.80  # 0.8s gentle silence before voice starts

# Add initial 0.8s silence
silence_initial = np.zeros(to_sample(0.80), dtype=np.int16)
new_audio_chunks.append(silence_initial)

for idx, p in enumerate(phrases):
    s_idx = to_sample(p["start"])
    e_idx = min(len(audio), to_sample(p["end"]))
    chunk = audio[s_idx:e_idx].copy()
    chunk_dur = len(chunk) / sr

    # 12ms micro-fade to prevent pops/clicks
    fade_len = int(0.012 * sr)
    if len(chunk) > 2 * fade_len:
        fade_in = np.linspace(0.0, 1.0, fade_len)
        fade_out = np.linspace(1.0, 0.0, fade_len)
        chunk[:fade_len] = (chunk[:fade_len] * fade_in).astype(np.int16)
        chunk[-fade_len:] = (chunk[-fade_len:] * fade_out).astype(np.int16)

    spoken_start = current_time
    spoken_end = spoken_start + chunk_dur

    events.append({
        "phrase_idx": idx + 1,
        "start": spoken_start,
        "end": spoken_end,
        "text": p["text"]
    })

    new_audio_chunks.append(chunk)
    current_time += chunk_dur

    pause_dur = p["pause_after"]
    pause_chunk = np.zeros(to_sample(pause_dur), dtype=np.int16)
    new_audio_chunks.append(pause_chunk)
    current_time += pause_dur

final_audio = np.concatenate(new_audio_chunks)
total_dur = len(final_audio) / sr

# Write output paced audio
with wave.open(OUT_WAV, "wb") as f:
    f.setnchannels(n_ch)
    f.setsampwidth(sampwidth)
    f.setframerate(sr)
    f.writeframes(final_audio.tobytes())

print(f"[Pacer Fixed] Output Audio: {OUT_WAV} ({total_dur:.2f}s)")
print(f"[Pacer Fixed] In 20-30s range? {20.0 <= total_dur <= 30.0}")

# Format ASS Subtitles with ZERO POINTS / NO PERIODS
def sec_to_ass(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"

ass_content = """[Script Info]
Title: Whisprs Cloned Voice Fixed - Normal Speed Zero Points
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
"""

for ev in events:
    # Ensure absolutely zero points / periods in text
    clean_text = ev["text"].replace(".", "").replace("!", "").replace("?", "").strip()
    s_ass = sec_to_ass(max(0.0, ev["start"] - 0.05))
    e_ass = sec_to_ass(ev["end"] + 0.10)
    ass_content += f"Dialogue: 0,{s_ass},{e_ass},WhisprsItalic,,0,0,0,,{{\\fad(120,80)}}{clean_text}\n"

with open(ASS_PATH, "w", encoding="utf-8") as f:
    f.write(ass_content)

meta = {
    "total_duration": total_dur,
    "speed": "1.0x (normal speed)",
    "voice_engine": "qwen_0.6b_cloned_whisper",
    "punctuation": "no points / no periods",
    "events": events
}

with open(META_JSON, "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)

print(f"[Pacer Fixed] Metadata saved to {META_JSON}")
