import json
import os
import sys
from faster_whisper import WhisperModel

print("Loading faster-whisper model (small.en)...", flush=True)
model = WhisperModel("small.en", device="cpu", compute_type="int8")

files = [
    ("1132087069788981", "C:/Users/majji/whisprs_video_studio/reference_analysis/downloaded/ref_1132087069788981.wav"),
    ("1049069394813658", "C:/Users/majji/whisprs_video_studio/reference_analysis/downloaded/ref_1049069394813658.wav"),
    ("29568061286112541", "C:/Users/majji/whisprs_video_studio/reference_analysis/downloaded/ref_29568061286112541.wav")
]

results = {}

for reel_id, wav_path in files:
    print(f"\nProcessing Reel {reel_id}...", flush=True)
    segments, info = model.transcribe(wav_path, word_timestamps=True, beam_size=5)
    
    seg_list = []
    all_words = []
    for s in segments:
        words = []
        if s.words:
            for w in s.words:
                words.append({
                    "word": w.word.strip(),
                    "start": round(w.start, 2),
                    "end": round(w.end, 2),
                    "duration": round(w.end - w.start, 2),
                    "probability": round(w.probability, 2)
                })
                all_words.append(w)
        seg_list.append({
            "start": round(s.start, 2),
            "end": round(s.end, 2),
            "text": s.text.strip(),
            "words": words
        })
        print(f"[{s.start:.2f}s -> {s.end:.2f}s] {s.text.strip()}", flush=True)

    results[reel_id] = {
        "text": " ".join([s["text"] for s in seg_list]),
        "segments": seg_list,
        "total_words": len(all_words)
    }

out_file = "C:/Users/majji/whisprs_video_studio/reference_analysis/whisper_transcripts.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print(f"\nDone! Saved to {out_file}", flush=True)
