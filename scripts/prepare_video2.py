import json
import soundfile as sf
import numpy as np

def format_ass_time(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h}:{m:02d}:{s:05.2f}"

# Load alignment
with open(r"C:\Users\majji\whisprs_video_studio\scratch\v6_speech2_alignment.json", "r") as f:
    align = json.load(f)

# Load raw slowed audio
audio, sr = sf.read(r"C:\Users\majji\whisprs_video_studio\scratch\v6_speech2_slow15.wav")
if audio.ndim > 1:
    audio = audio.mean(axis=1)

phrases = [
    {
        "text": "you have been strong for so long\\nthat you forgot how to rest",
        "start": 0.00,
        "end": 3.45
    },
    {
        "text": "it is okay\\nto put the shield down",
        "start": 4.22,
        "end": 6.15
    },
    {
        "text": "nobody is expecting you\\nto hold the sky up by yourself",
        "start": 6.60,
        "end": 9.68
    },
    {
        "text": "tonight forgive yourself for being human -\\ntomorrow is a new beginning",
        "start": 10.18,
        "end": 14.25
    }
]

# Build paced audio
intro_silence = 0.80
pause_between = 0.90
target_duration = 24.00

paced_audio = [np.zeros(int(intro_silence * sr), dtype=audio.dtype)]
subtitles = []
current_time = intro_silence

for idx, p in enumerate(phrases):
    start_sample = int(p["start"] * sr)
    end_sample = int(p["end"] * sr)
    chunk = audio[start_sample:end_sample]
    
    # 20ms fade in/out to avoid pop
    fade_len = int(0.02 * sr)
    if len(chunk) > 2 * fade_len:
        chunk[:fade_len] *= np.linspace(0, 1, fade_len)
        chunk[-fade_len:] *= np.linspace(1, 0, fade_len)
        
    chunk_dur = len(chunk) / sr
    sub_start = current_time
    sub_end = current_time + chunk_dur + 0.15 # slight hold
    
    subtitles.append((sub_start, sub_end, p["text"]))
    paced_audio.append(chunk)
    
    current_time += chunk_dur
    if idx < len(phrases) - 1:
        silence_chunk = np.zeros(int(pause_between * sr), dtype=audio.dtype)
        paced_audio.append(silence_chunk)
        current_time += pause_between

# Add outro silence to reach exactly 24.0s
remaining = target_duration - current_time
if remaining > 0:
    paced_audio.append(np.zeros(int(remaining * sr), dtype=audio.dtype))

final_audio = np.concatenate(paced_audio)
print(f"Video 2 Paced Audio Duration: {len(final_audio)/sr:.2f}s")

out_wav = r"C:\Users\majji\whisprs_video_studio\audio\whisprs_v6_speech2_paced.wav"
sf.write(out_wav, final_audio, sr)
print(f"Saved: {out_wav}")

# Write ASS file
ass_header = """[Script Info]
Title: Whisprs Flow Video 2 Paced
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

events = []
for start_t, end_t, text in subtitles:
    events.append(f"Dialogue: 0,{format_ass_time(start_t)},{format_ass_time(end_t)},WhisprsItalic,,0,0,0,,{{\\i1}}{text}")

out_ass = r"C:\Users\majji\whisprs_video_studio\scratch\whisprs_v6_video2.ass"
with open(out_ass, "w", encoding="utf-8") as f:
    f.write(ass_header + "\n".join(events) + "\n")
print(f"Saved: {out_ass}")
for e in events:
    print("  ", e)
