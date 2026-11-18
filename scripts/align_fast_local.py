import os
import sys
import json
import wave
from faster_whisper import WhisperModel

MODEL_PATH = "C:/Users/majji/AppData/Local/OmniVoice/hf_cache/models--deepdml--faster-whisper-large-v3-turbo-ct2/snapshots/4df90f75321148c3a29a9e2351b7ddf8f5b115a8"
WAV_PATH = "C:/Users/majji/whisprs_video_studio/audio/whisprs_video4_voicestudio_raw.wav"
OUT_JSON = "C:/Users/majji/whisprs_video_studio/output/whisprs_video4_alignment.json"

print(f"Loading local cached Whisper model from: {MODEL_PATH}")
# Check if model exists
if not os.path.exists(MODEL_PATH):
    print("Error: local model path does not exist!")
    sys.exit(1)

model = WhisperModel(MODEL_PATH, device="cpu", compute_type="int8")
print("Model loaded successfully!")

with wave.open(WAV_PATH, "rb") as f:
    duration = f.getnframes() / f.getframerate()

print(f"Transcribing {WAV_PATH} (Duration: {duration:.2f}s)...")
segments, info = model.transcribe(WAV_PATH, beam_size=5, word_timestamps=True)

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

os.makedirs(os.path.dirname(OUT_JSON), exist_ok=True)
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump({
        "duration": duration,
        "alignment": alignment
    }, f, indent=2)

print(f"Alignment JSON saved to: {OUT_JSON}")
