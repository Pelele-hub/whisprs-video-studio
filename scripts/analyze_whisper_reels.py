import json
import os
import whisperx
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading WhisperX on {device}...")
model = whisperx.load_model("base.en", device, compute_type="float32" if device == "cpu" else "float16")

files = [
    ("1132087069788981", "C:/Users/majji/whisprs_video_studio/reference_analysis/downloaded/ref_1132087069788981.wav"),
    ("1049069394813658", "C:/Users/majji/whisprs_video_studio/reference_analysis/downloaded/ref_1049069394813658.wav"),
    ("29568061286112541", "C:/Users/majji/whisprs_video_studio/reference_analysis/downloaded/ref_29568061286112541.wav")
]

results = {}

for reel_id, wav_path in files:
    print(f"\n--- Transcribing Reel {reel_id} ---")
    audio = whisperx.load_audio(wav_path)
    result = model.transcribe(audio, batch_size=4)
    
    # Align whisper output
    model_a, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
    result = whisperx.align(result["segments"], model_a, metadata, audio, device, return_char_alignments=False)
    
    segments = []
    all_words = []
    for seg in result["segments"]:
        segments.append({
            "start": round(seg["start"], 2),
            "end": round(seg["end"], 2),
            "text": seg["text"].strip(),
            "words": [{
                "word": w.get("word", ""),
                "start": round(w.get("start", 0), 2),
                "end": round(w.get("end", 0), 2),
                "duration": round(w.get("end", 0) - w.get("start", 0), 2)
            } for w in seg.get("words", [])]
        })
        for w in seg.get("words", []):
            all_words.append(w)
            
    results[reel_id] = {
        "text": " ".join([s["text"] for s in segments]),
        "segments": segments,
        "word_count": len(all_words)
    }

out_file = "C:/Users/majji/whisprs_video_studio/reference_analysis/whisper_transcripts.json"
with open(out_file, "w", encoding="utf-8") as f:
    json.dump(results, f, indent=2)

print(f"\nSaved analysis to {out_file}")
