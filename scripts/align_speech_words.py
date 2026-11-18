import os
import sys
import json
import argparse
import soundfile as sf
import numpy as np

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--wav", type=str, required=True, help="Input audio wav")
    parser.add_argument("--out_json", type=str, required=True, help="Output alignment JSON")
    args = parser.parse_args()

    # Read audio duration
    data, sr = sf.read(args.wav)
    duration = len(data) / sr

    print(f"[Whisper Alignment] Transcribing {args.wav} (Duration: {duration:.2f}s)...")
    from faster_whisper import WhisperModel
    model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, info = model.transcribe(args.wav, beam_size=5, word_timestamps=True)

    words = []
    clauses = []

    for s in segments:
        current_words = []
        for w in s.words:
            clean_word = w.word.strip()
            if clean_word:
                current_words.append({
                    "word": clean_word,
                    "start": round(float(w.start), 2),
                    "end": round(float(w.end), 2)
                })

        # Group words into natural sentence clauses (break strictly at punctuation or when clause >= 8 words)
        current_clause = []
        for item in current_words:
            current_clause.append(item)
            has_punct = item["word"].endswith((".", "!", "?", ";"))
            if has_punct or len(current_clause) >= 8:
                clause_text = " ".join([x["word"] for x in current_clause])
                clauses.append({
                    "start": current_clause[0]["start"],
                    "end": current_clause[-1]["end"],
                    "text": clause_text
                })
                current_clause = []

        # Merge short dangling clauses (<= 2 words) into the preceding clause
        merged_clauses = []
        for c in clauses:
            word_count = len(c["text"].split())
            if word_count <= 2 and merged_clauses:
                merged_clauses[-1]["text"] += " " + c["text"]
                merged_clauses[-1]["end"] = c["end"]
            else:
                merged_clauses.append(c)
        clauses = merged_clauses

    print(f"[Whisper Alignment] Generated {len(clauses)} synchronized subtitle clauses:")
    for c in clauses:
        print(f"   [{c['start']:.2f}s -> {c['end']:.2f}s]: \"{c['text']}\"")

    os.makedirs(os.path.dirname(args.out_json), exist_ok=True)
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump({
            "duration": duration,
            "clauses": clauses
        }, f, indent=2)

    print(f"[Whisper Alignment] Alignment JSON saved: {args.out_json}")

if __name__ == "__main__":
    main()
