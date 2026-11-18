import os
import sys
import json
import wave
import subprocess
import numpy as np
from faster_whisper import WhisperModel

MODEL_PATH = "C:/Users/majji/AppData/Local/OmniVoice/hf_cache/models--deepdml--faster-whisper-large-v3-turbo-ct2/snapshots/4df90f75321148c3a29a9e2351b7ddf8f5b115a8"
WAV_PATH = "C:/Users/majji/whisprs_video_studio/audio/whisprs_video5_voicestudio_raw.wav"
TEMP_16K = "C:/Users/majji/whisprs_video_studio/scratch/video5_16k.wav"
OUT_JSON = "C:/Users/majji/whisprs_video_studio/output/whisprs_video5_alignment.json"

os.makedirs(os.path.dirname(TEMP_16K), exist_ok=True)
os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)

# 1. Resample to 16kHz mono using ffmpeg
print("Resampling audio to 16kHz mono...")
subprocess.run([
    "ffmpeg", "-y", "-i", WAV_PATH, "-ar", "16000", "-ac", "1", TEMP_16K
], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

with wave.open(TEMP_16K, "rb") as f:
    sr = f.getframerate()
    n_frames = f.getnframes()
    data = f.readframes(n_frames)
    duration = n_frames / sr
    audio = np.frombuffer(data, dtype=np.int16).astype(np.float32) / 32768.0

print(f"Loading local cached Whisper model from: {MODEL_PATH}")
model = WhisperModel(MODEL_PATH, device="cpu", compute_type="int8")
print(f"Transcribing audio array ({len(audio)} samples, {duration:.2f}s)...")

segments, info = model.transcribe(audio, beam_size=5, word_timestamps=True)

alignment = []
for s in segments:
    text = s.text.strip()
    words = []
    if s.words:
        for w in s.words:
            words.append({
                "word": w.word.strip(),
                "start": round(w.start, 2),
                "end": round(w.end, 2)
            })
    if text:
        alignment.append({
            "start": round(s.start, 2),
            "end": round(s.end, 2),
            "text": text,
            "words": words
        })
        print(f"   [{s.start:.2f}s -> {s.end:.2f}s]: \"{text}\"")

with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump({
        "duration": duration,
        "alignment": alignment
    }, f, indent=2)

print(f"Alignment JSON saved to: {OUT_JSON}")
try:
    os.remove(TEMP_16K)
except Exception:
    pass
