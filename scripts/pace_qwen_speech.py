import os
import wave
import json
import numpy as np

RAW_WAV = "C:/Users/majji/whisprs_video_studio/audio/qwen3_cloned_original_voice.wav"
OUT_WAV = "C:/Users/majji/whisprs_video_studio/audio/whisprs_qwen06_paced_1s.wav"
ASS_PATH = "C:/Users/majji/whisprs_video_studio/scratch/whisprs_flow_qwen06.ass"
META_JSON = "C:/Users/majji/whisprs_video_studio/scratch/whisprs_qwen06_meta.json"

os.makedirs(os.path.dirname(OUT_WAV), exist_ok=True)
os.makedirs(os.path.dirname(ASS_PATH), exist_ok=True)

# Load raw WAV
with wave.open(RAW_WAV, "rb") as f:
    sr = f.getframerate()
    n_ch = f.getnchannels()
    sampwidth = f.getsampwidth()
    n_frames = f.getnframes()
    raw_bytes = f.readframes(n_frames)
    audio = np.frombuffer(raw_bytes, dtype=np.int16)

print(f"[Pacer] Loaded: {RAW_WAV} | {sr}Hz | {n_ch}ch | {len(audio)/sr:.2f}s")

# Accurate cuts based on Whisper word boundaries:
# 1: "You don't always need to explain your quiet." (0.00 -> 2.15s)
# 2: "Some days just making it through is enough." (2.75 -> 4.80s)
# 3: "Be gentle with your tired heart tonight." (5.30 -> 7.20s)
# 4: "You are surviving..." (7.75 -> 8.55s)
# 5: "and that is more than enough." (8.75 -> 9.95s)

def to_sample(sec):
    return int(sec * sr)

cut_ranges = [
    {"start": 0.00, "end": 2.15, "text": "You don't always need\\Nto explain your quiet.", "pause_after": 1.00},
    {"start": 2.72, "end": 4.80, "text": "Some days...\\Njust making it through is enough.", "pause_after": 1.00},
    {"start": 5.30, "end": 7.20, "text": "Be gentle with\\Nyour tired heart tonight.", "pause_after": 1.00},
    {"start": 7.75, "end": 8.55, "text": "You are surviving...", "pause_after": 0.60},
    {"start": 8.75, "end": 9.95, "text": "and that is more than enough.", "pause_after": 2.50} # Lingering outro
]

new_audio_chunks = []
events = []
current_time = 0.50 # 0.5s gentle silence before voice starts

# Add initial 0.5s silence
silence_initial = np.zeros(to_sample(0.50), dtype=np.int16)
new_audio_chunks.append(silence_initial)

scene_timing = []

for idx, cr in enumerate(cut_ranges):
    s_idx = to_sample(cr["start"])
    e_idx = min(len(audio), to_sample(cr["end"]))
    chunk = audio[s_idx:e_idx].copy()
    chunk_dur = len(chunk) / sr

    # Fade in / fade out 10ms to prevent clicks
    fade_len = int(0.010 * sr)
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
        "text": cr["text"]
    })

    new_audio_chunks.append(chunk)
    current_time += chunk_dur

    pause_dur = cr["pause_after"]
    pause_chunk = np.zeros(to_sample(pause_dur), dtype=np.int16)
    new_audio_chunks.append(pause_chunk)

    # Scene duration for video cutting
    scene_dur = chunk_dur + pause_dur
    if idx == 0:
        scene_dur += 0.50 # includes initial intro silence
    scene_timing.append({
        "scene_idx": idx + 1,
        "duration": round(scene_dur, 2),
        "spoken_start": round(spoken_start, 2),
        "spoken_end": round(spoken_end, 2)
    })
    current_time += pause_dur

final_audio = np.concatenate(new_audio_chunks)
total_dur = len(final_audio) / sr

print(f"[Pacer] Total Paced Duration: {total_dur:.2f}s across {len(cut_ranges)} phrases")
for s in scene_timing:
    print(f"   Scene {s['scene_idx']}: {s['duration']}s (Spoken: {s['spoken_start']}s -> {s['spoken_end']}s)")

# Write WAV
with wave.open(OUT_WAV, "wb") as f:
    f.setnchannels(n_ch)
    f.setsampwidth(sampwidth)
    f.setframerate(sr)
    f.writeframes(final_audio.tobytes())

print(f"[Pacer] Paced WAV written: {OUT_WAV}")

# Generate ASS Subtitles
def format_ass(sec):
    s = max(0.0, sec)
    m = int(s // 60)
    rem = s % 60
    ss = int(rem)
    cs = int(round((rem - ss) * 100))
    if cs >= 100:
        cs = 99
    return f"0:{m:02d}:{ss:02d}.{cs:02d}"

ass_dialogues = []
for ev in events:
    # Subtitle appears 0.05s before speech and lingers 0.25s after speech finishes
    t_start = format_ass(ev["start"] - 0.05)
    t_end = format_ass(ev["end"] + 0.25)
    ass_dialogues.append(
        f"Dialogue: 0,{t_start},{t_end},WhisprsItalic,,0,0,0,,{{\\i1}}{ev['text']}"
    )

ass_content = f"""[Script Info]
Title: Whisprs Flow Qwen 0.6 Precision Subtitles
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
{chr(10).join(ass_dialogues)}
"""

with open(ASS_PATH, "w", encoding="utf-8") as f:
    f.write(ass_content)

print(f"[Pacer] ASS Subtitles written: {ASS_PATH}")

meta = {
    "audio_path": OUT_WAV,
    "ass_path": ASS_PATH,
    "total_duration": round(total_dur, 2),
    "scenes": scene_timing,
    "events": events
}

with open(META_JSON, "w", encoding="utf-8") as f:
    json.dump(meta, f, indent=2)

print(f"[Pacer] Meta JSON written: {META_JSON}")
