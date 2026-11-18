import json
import soundfile as sf
import numpy as np

def format_ass_time(sec):
    h = int(sec // 3600)
    m = int((sec % 3600) // 60)
    s = sec % 60
    return f"{h}:{m:02d}:{s:05.2f}"

# Load slowed continuous audio
raw_audio, sr = sf.read(r"C:\Users\majji\whisprs_video_studio\scratch\v6_speech2_clean_slow15.wav")
if raw_audio.ndim > 1:
    raw_audio = raw_audio.mean(axis=1)

# Intro padding: 0.80 seconds
intro_sec = 0.80
intro_samples = int(intro_sec * sr)
padded_audio = np.concatenate([np.zeros(intro_samples, dtype=raw_audio.dtype), raw_audio])

# Smooth gentle 400ms fade-out at the very end of speech audio (around 0.8s + 17.57s = 18.37s)
total_speech_len = len(padded_audio) / sr
print(f"Speech + Intro duration: {total_speech_len:.2f}s")

# Target total audio duration: 24.00s
target_dur = 24.00
target_samples = int(target_dur * sr)
if len(padded_audio) < target_samples:
    silence_tail = np.zeros(target_samples - len(padded_audio), dtype=raw_audio.dtype)
    final_audio = np.concatenate([padded_audio, silence_tail])
else:
    final_audio = padded_audio[:target_samples]

out_wav = r"C:\Users\majji\whisprs_video_studio\audio\whisprs_v6_speech2_paced_fixed.wav"
sf.write(out_wav, final_audio, sr)
print(f"Saved fixed audio: {out_wav} ({len(final_audio)/sr:.2f}s)")

# Load word alignment from Whisper
with open(r"C:\Users\majji\whisprs_video_studio\scratch\v6_speech2_clean_slow15_words.json", "r") as f:
    words = json.load(f)

# Subtitle events (with intro_sec offset)
# Card 1: 0.00 to 4.22 -> shifted: 0.80 to 5.05
# Card 2: 4.44 to 6.58 -> shifted: 5.24 to 7.40
# Card 3: 7.42 to 10.38 -> shifted: 8.22 to 11.20
# Card 4: 11.46 to 14.54 -> shifted: 12.26 to 15.35
# Card 5: 15.48 to 16.72 -> shifted: 16.28 to 17.80

subtitles = [
    {
        "text": "you have been strong for so long\\nthat you forgot how to rest",
        "start": intro_sec + 0.00,
        "end": intro_sec + 4.25
    },
    {
        "text": "it is okay\\nto put the shield down",
        "start": intro_sec + 4.44,
        "end": intro_sec + 6.60
    },
    {
        "text": "nobody is expecting you\\nto hold the sky up by yourself",
        "start": intro_sec + 7.42,
        "end": intro_sec + 10.40
    },
    {
        "text": "tonight forgive yourself\\nfor being human",
        "start": intro_sec + 11.46,
        "end": intro_sec + 14.55
    },
    {
        "text": "tomorrow is a new beginning",
        "start": intro_sec + 15.48,
        "end": intro_sec + 17.10
    }
]

ass_header = """[Script Info]
Title: Whisprs Flow Video 2 Fixed
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
for s in subtitles:
    start_str = format_ass_time(s["start"])
    end_str = format_ass_time(s["end"])
    events.append(f"Dialogue: 0,{start_str},{end_str},WhisprsItalic,,0,0,0,,{{\\i1}}{s['text']}")

out_ass = r"C:\Users\majji\whisprs_video_studio\output\whisprs_video2_interstellar_master.ass"
with open(out_ass, "w", encoding="utf-8") as f:
    f.write(ass_header + "\n".join(events) + "\n")
print(f"Saved fixed ASS: {out_ass}")
for e in events:
    print("  ", e)
