import os
import sys
import json
import wave
import subprocess
import numpy as np
from faster_whisper import WhisperModel

MODEL_PATH = "C:/Users/majji/AppData/Local/OmniVoice/hf_cache/models--deepdml--faster-whisper-large-v3-turbo-ct2/snapshots/4df90f75321148c3a29a9e2351b7ddf8f5b115a8"
RAW_WAV = "C:/Users/majji/whisprs_video_studio/audio/whisprs_video5b_raw.wav"
TEMP_16K = "C:/Users/majji/whisprs_video_studio/scratch/video5b_16k.wav"
FINAL_WAV = "C:/Users/majji/whisprs_video_studio/audio/whisprs_video5_paced_1s_pause.wav"
ASS_PATH = "C:/Users/majji/whisprs_video_studio/scratch/whisprs_flow_video5_paced.ass"
META_JSON = "C:/Users/majji/whisprs_video_studio/output/whisprs_video5_paced_meta.json"

os.makedirs(os.path.dirname(TEMP_16K), exist_ok=True)
os.makedirs(os.path.dirname(FINAL_WAV), exist_ok=True)

# 1. Resample to 16kHz for faster-whisper alignment
print("Resampling audio to 16kHz mono for Whisper alignment...")
subprocess.run([
    "ffmpeg", "-y", "-i", RAW_WAV, "-ar", "16000", "-ac", "1", TEMP_16K
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

with wave.open(TEMP_16K, "rb") as f:
    sr_whisper = f.getframerate()
    n_frames_w = f.getnframes()
    data_w = f.readframes(n_frames_w)
    audio_w = np.frombuffer(data_w, dtype=np.int16).astype(np.float32) / 32768.0

# 2. Also load the full original audio at native samplerate (usually 24000Hz or 44100Hz)
with wave.open(RAW_WAV, "rb") as f:
    orig_sr = f.getframerate()
    orig_nchannels = f.getnchannels()
    orig_sampwidth = f.getsampwidth()
    orig_frames = f.readframes(f.getnframes())
    orig_audio = np.frombuffer(orig_frames, dtype=np.int16)

print(f"Original Audio: {orig_sr} Hz, {orig_nchannels} ch, length: {len(orig_audio)/orig_sr:.2f}s")

# 3. Transcribe & align with faster-whisper
print(f"Loading Whisper model from: {MODEL_PATH}")
model = WhisperModel(MODEL_PATH, device="cpu", compute_type="int8")
segments, info = model.transcribe(audio_w, beam_size=5, word_timestamps=True)

raw_segments = []
for s in segments:
    text = s.text.strip()
    if text:
        raw_segments.append({
            "start": round(s.start, 2),
            "end": round(s.end, 2),
            "text": text
        })
        print(f"   Raw Segment: [{s.start:.2f}s -> {s.end:.2f}s]: \"{text}\"")

# Group into the 5 target phrases:
# Phrase 1: You don't have to carry the weight of everything you cannot change.
# Phrase 2: It's okay to feel tired in a world that never stops moving.
# Phrase 3: Healing is not a race; it is simply learning to breathe again.
# Phrase 4: Give yourself grace for the silent battles nobody ever saw.
# Phrase 5: Tonight, let your heavy thoughts rest, and trust that tomorrow will be kinder.

target_phrases = [
    "You don't have to carry the weight of everything you cannot change.",
    "It's okay to feel tired in a world that never stops moving.",
    "Healing is not a race; it is simply learning to breathe again.",
    "Give yourself grace for the silent battles nobody ever saw.",
    "Tonight, let your heavy thoughts rest, and trust that tomorrow will be kinder."
]

# Map raw segments into the 5 phrases based on text match
phrases = []
curr_idx = 0
for seg in raw_segments:
    t = seg["text"].lower()
    if "cannot change" in t or "weight" in t:
        phrases.append({"idx": 0, "start": seg["start"], "end": seg["end"], "text": target_phrases[0]})
    elif "tired" in t or "stops moving" in t:
        phrases.append({"idx": 1, "start": seg["start"], "end": seg["end"], "text": target_phrases[1]})
    elif "healing" in t or "breathe again" in t:
        if len(phrases) > 2 and phrases[-1]["idx"] == 2:
            phrases[-1]["end"] = max(phrases[-1]["end"], seg["end"])
        else:
            phrases.append({"idx": 2, "start": seg["start"], "end": seg["end"], "text": target_phrases[2]})
    elif "silent battles" in t or "grace" in t:
        phrases.append({"idx": 3, "start": seg["start"], "end": seg["end"], "text": target_phrases[3]})
    elif "kinder" in t or "heavy thoughts" in t:
        if len(phrases) > 4 and phrases[-1]["idx"] == 4:
            phrases[-1]["end"] = max(phrases[-1]["end"], seg["end"])
        else:
            phrases.append({"idx": 4, "start": seg["start"], "end": seg["end"], "text": target_phrases[4]})

# Fallback if grouping didn't catch 5
if len(phrases) != 5:
    print(f"Warning: Extracted {len(phrases)} phrases, falling back to segment grouping...")
    # Merge if segment 3 was split (e.g., 'Healing is not a race' and 'It is simply...')
    # Let's inspect raw_segments
    merged = []
    for r in raw_segments:
        if merged and "healing" in merged[-1]["text"].lower() and "breathe" in r["text"].lower():
            merged[-1]["end"] = r["end"]
            merged[-1]["text"] = target_phrases[2]
        else:
            merged.append(r)
    phrases = []
    for i, m in enumerate(merged[:5]):
        phrases.append({
            "idx": i,
            "start": m["start"],
            "end": m["end"],
            "text": target_phrases[i] if i < len(target_phrases) else m["text"]
        })

print("\n--- Structured 5 Phrases (Pre-Pacing) ---")
for p in phrases:
    print(f"Phrase {p['idx']+1}: [{p['start']:.2f}s -> {p['end']:.2f}s] ({p['end']-p['start']:.2f}s) \"{p['text']}\"")

# 4. Splice each phrase and insert exactly 1.000s of clean digital silence between each!
SILENCE_DURATION = 1.00 # 1.0 second pause between each phrase
silence_samples = np.zeros(int(orig_sr * SILENCE_DURATION), dtype=np.int16)

new_audio_chunks = []
paced_events = []
current_time = 0.0

scene_durations = []

for i, p in enumerate(phrases):
    start_sample = int(p["start"] * orig_sr)
    # Add 0.04s decay buffer to preserve room resonance / breath without cutting abruptly
    end_sample = min(len(orig_audio), int((p["end"] + 0.04) * orig_sr))
    phrase_chunk = orig_audio[start_sample:end_sample]
    phrase_duration = len(phrase_chunk) / orig_sr
    
    spoken_start = current_time
    spoken_end = spoken_start + phrase_duration
    
    paced_events.append({
        "phrase_idx": i + 1,
        "start": spoken_start,
        "end": spoken_end,
        "text": p["text"]
    })
    
    new_audio_chunks.append(phrase_chunk)
    current_time += phrase_duration
    
    if i < len(phrases) - 1:
        # Insert 1.0 second pause
        new_audio_chunks.append(silence_samples)
        current_time += SILENCE_DURATION
        # Scene cut point: cut occurs in the middle of the 1s pause (+0.5s)
        scene_dur = phrase_duration + SILENCE_DURATION
        scene_durations.append(round(scene_dur, 2))
    else:
        # Final scene includes lingering musical outro
        final_scene_dur = phrase_duration + 2.0
        scene_durations.append(round(final_scene_dur, 2))

final_audio = np.concatenate(new_audio_chunks)
total_speech_duration = len(final_audio) / orig_sr

print(f"\nFinal Paced Audio Duration: {total_speech_duration:.2f}s")
print(f"Scene Durations (5 Scenes): {scene_durations} -> Total: {sum(scene_durations):.2f}s")

# 5. Write paced audio to FINAL_WAV
with wave.open(FINAL_WAV, "wb") as f:
    f.setnchannels(orig_nchannels)
    f.setsampwidth(orig_sampwidth)
    f.setframerate(orig_sr)
    f.writeframes(final_audio.tobytes())

print(f"Saved paced audio with exact 1.0s phrase pauses: {FINAL_WAV}")

# 6. Generate Pause-Disappear ASS Subtitles
def format_ass_time(sec):
    s = max(0.0, sec)
    m = int(s // 60)
    rem = s % 60
    ss = int(rem)
    cs = int(round((rem - ss) * 100))
    if cs >= 100:
        cs = 99
    return f"0:{m:02d}:{ss:02d}.{cs:02d}"

total_video_dur = sum(scene_durations)

ass_header = f"""[Script Info]
Title: Whisprs Flow Video 5 Paced - 1.0s Pause Subtitles
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

formatted_lines = [
    "You don't have to carry the weight\\Nof everything you cannot change.",
    "It's okay to feel tired\\Nin a world that never stops moving.",
    "Healing is not a race;\\Nit is simply learning to breathe again.",
    "Give yourself grace\\Nfor the silent battles nobody ever saw.",
    "Tonight, let your heavy thoughts rest,\\Nand trust that tomorrow will be kinder."
]

ass_events = []
for idx, ev in enumerate(paced_events):
    start_str = format_ass_time(ev["start"])
    end_str = format_ass_time(ev["end"])
    text = formatted_lines[idx]
    ass_events.append(f"Dialogue: 0,{start_str},{end_str},WhisprsItalic,,0,0,0,,{{\\i1}}{text}")
    print(f"Subtitle {idx+1}: [{start_str} -> {end_str}] \"{text.replace('\\N', ' ')}\"")

ass_content = ass_header + "\n".join(ass_events) + "\n"
with open(ASS_PATH, "w", encoding="utf-8") as f:
    f.write(ass_content)

print(f"Saved Pause-Disappear ASS file: {ASS_PATH}")

# 7. Save metadata JSON
with open(META_JSON, "w", encoding="utf-8") as f:
    json.dump({
        "total_video_duration": total_video_dur,
        "scene_durations": scene_durations,
        "events": paced_events
    }, f, indent=2)

print(f"Metadata saved to: {META_JSON}")
try:
    os.remove(TEMP_16K)
except Exception:
    pass
