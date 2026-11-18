import json
import wave
from faster_whisper import WhisperModel

print("Loading cached faster-whisper base model on CPU...", flush=True)
model = WhisperModel("base", device="cpu", compute_type="int8")

files = [
    ("1132087069788981", "C:/Users/majji/whisprs_video_studio/reference_analysis/downloaded/ref_1132087069788981.wav"),
    ("1049069394813658", "C:/Users/majji/whisprs_video_studio/reference_analysis/downloaded/ref_1049069394813658.wav"),
    ("29568061286112541", "C:/Users/majji/whisprs_video_studio/reference_analysis/downloaded/ref_29568061286112541.wav")
]

results = {}

for reel_id, wav_path in files:
    with wave.open(wav_path, 'rb') as wf:
        frames = wf.getnframes()
        rate = wf.getframerate()
        duration = frames / float(rate)

    print(f"\n=======================================================", flush=True)
    print(f"Reel ID: {reel_id} | Total Audio Duration: {duration:.2f}s", flush=True)
    print(f"=======================================================", flush=True)

    segments, info = model.transcribe(wav_path, word_timestamps=True, beam_size=5)
    
    seg_list = []
    all_words = []
    for s in segments:
        words = []
        if s.words:
            for w in s.words:
                clean_w = w.word.strip()
                if clean_w:
                    words.append({
                        "word": clean_w,
                        "start": round(w.start, 2),
                        "end": round(w.end, 2),
                        "duration": round(w.end - w.start, 2)
                    })
                    all_words.append(clean_w)
        seg_list.append({
            "start": round(s.start, 2),
            "end": round(s.end, 2),
            "duration": round(s.end - s.start, 2),
            "text": s.text.strip(),
            "words": words
        })
        print(f"[{s.start:5.2f}s -> {s.end:5.2f}s] ({s.end - s.start:4.2f}s) \"{s.text.strip()}\"", flush=True)

    results[reel_id] = {
        "duration": duration,
        "full_text": " ".join([s["text"] for s in seg_list]),
        "segments": seg_list,
        "word_count": len(all_words),
        "speaking_rate_wps": round(len(all_words) / duration, 2)
    }

out_file = "C:/Users/majji/whisprs_video_studio/reference_analysis/reference_reels_deep_transcripts.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print(f"\nSaved complete deep analysis to {out_file}", flush=True)
