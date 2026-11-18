import os
import wave
import json
import numpy as np

RAW_WAV = "C:/Users/majji/whisprs_video_studio/scratch/test_slow_15.wav"
OUT_WAV = "C:/Users/majji/whisprs_video_studio/audio/whisprs_qwen06_slow15_paced.wav"
ASS_PATH = "C:/Users/majji/whisprs_video_studio/scratch/whisprs_flow_qwen06_slow15.ass"
META_JSON = "C:/Users/majji/whisprs_video_studio/scratch/whisprs_flow_qwen06_slow15_meta.json"

os.makedirs(os.path.dirname(OUT_WAV), exist_ok=True)
os.makedirs(os.path.dirname(ASS_PATH), exist_ok=True)

with wave.open(RAW_WAV, "rb") as f:
    sr = f.getframerate()
    n_ch = f.getnchannels()
    sampwidth = f.getsampwidth()
    n_frames = f.getnframes()
    raw_bytes = f.readframes(n_frames)
    audio = np.frombuffer(raw_bytes, dtype=np.int16)

print(f"[Pacer Slow 15%] Loaded: {RAW_WAV} | {sr}Hz | {n_ch}ch | {len(audio)/sr:.2f}s")

def to_sample(sec):
    return int(sec * sr)

# Cut ranges from Whisper alignment on the 15% slowed audio
phrases = [
    {
        "start": 0.00,
        "end": 2.35,
        "text": "you don't have to carry the weight of everything",
        "pause_after": 0.85
    },
    {
        "start": 2.65,
        "end": 5.10,
        "text": "because some things were never meant to be held",
        "pause_after": 0.95
    },
    {
        "start": 5.35,
        "end": 8.15,
        "text": "and when you feel tired in a world that never stops",
        "pause_after": 0.95
    },
    {
        "start": 8.60,
        "end": 11.15,
        "text": "remember that healing is just learning to breathe",
        "pause_after": 0.95
    },
    {
        "start": 11.65,
        "end": 13.60,
        "text": "so let your heavy thoughts rest",
        "pause_after": 0.70
    },
    {
        "start": 14.25,
        "end": 15.85,
        "text": "tomorrow will be kinder",
        "pause_after": 3.20  # Outro lingering piano solo
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

    # 12ms micro-fade to prevent any pops/clicks
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

with wave.open(OUT_WAV, "wb") as f:
    f.setnchannels(n_ch)
    f.setsampwidth(sampwidth)
    f.setframerate(sr)
    f.writeframes(final_audio.tobytes())

print(f"[Pacer Slow 15%] Output Audio: {OUT_WAV} ({total_dur:.2f}s)")

# Format ASS Subtitles
def sec_to_ass(seconds):
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = seconds % 60
    return f"{h}:{m:02d}:{s:05.2f}"

ass_content = """[Script Info]
Title: Whisprs - Qwen 0.6 Cloned Voice (-15% Hypnotic Pace)
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
"""

for ev in events:
    s_ass = sec_to_ass(ev["start"] - 0.05 if ev["start"] > 0.05 else 0.0)
    e_ass = sec_to_ass(ev["end"] + 0.10)
    ass_content += f"Dialogue: 0,{s_ass},{e_ass},WhisprsItalic,,0,0,0,,{{\\fad(140,90)}}{ev['text']}\n"

with open(ASS_PATH, "w", encoding="utf-8") as f:
    f.write(ass_content)

# Scene cuts matching 5 visual shots:
# Scene 1: 0.00 -> 3.70s ("you don't have to carry the weight of everything")
# Scene 2: 3.70 -> 7.40s ("because some things were never meant to be held")
# Scene 3: 7.40 -> 11.50s ("and when you feel tired in a world that never stops")
# Scene 4: 11.50 -> 15.30s ("remember that healing is just learning to breathe")
# Scene 5: 15.30 -> end ("so let your heavy thoughts rest - tomorrow will be kinder" + lingering piano outro)

s1_dur = round(events[0]["end"] + 0.60, 2) # ~3.75s
s2_dur = round(events[1]["end"] - events[0]["end"] + 0.30, 2) # ~3.70s
s3_dur = round(events[2]["end"] - events[1]["end"] + 0.10, 2) # ~4.10s
s4_dur = round(events[3]["end"] - events[2]["end"] + 0.10, 2) # ~3.85s
s5_dur = round(total_dur - (s1_dur + s2_dur + s3_dur + s4_dur), 2) # ~6.80s

scenes_meta = [
    {"scene_idx": 1, "duration": s1_dur, "text": events[0]["text"]},
    {"scene_idx": 2, "duration": s2_dur, "text": events[1]["text"]},
    {"scene_idx": 3, "duration": s3_dur, "text": events[2]["text"]},
    {"scene_idx": 4, "duration": s4_dur, "text": events[3]["text"]},
    {"scene_idx": 5, "duration": s5_dur, "text": f"{events[4]['text']} - {events[5]['text']}"}
]

with open(META_JSON, "w", encoding="utf-8") as f:
    json.dump({
        "total_duration": total_dur,
        "scenes": scenes_meta,
        "events": events
    }, f, indent=2)

print(f"[Pacer Slow 15%] ASS Saved: {ASS_PATH}")
print(f"[Pacer Slow 15%] Meta Saved: {META_JSON}")
for sm in scenes_meta:
    print(f"   Scene {sm['scene_idx']}: {sm['duration']:.2f}s | {sm['text']}")
