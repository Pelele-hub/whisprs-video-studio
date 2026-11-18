import os
import sys
import json
import argparse
import wave
from faster_whisper import WhisperModel

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--wav", type=str, required=True, help="Input audio wav")
    parser.add_argument("--out_json", type=str, required=True, help="Output alignment JSON")
    args = parser.parse_args()

    with wave.open(args.wav, "rb") as f:
        duration = f.getnframes() / f.getframerate()

    print(f"[Whisper Alignment] Transcribing {args.wav} (Duration: {duration:.2f}s)...")
    whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, info = whisper_model.transcribe(args.wav, beam_size=5, word_timestamps=True)

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

    os.makedirs(os.path.dirname(args.out_json), exist_ok=True)
    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump({
            "duration": duration,
            "alignment": alignment
        }, f, indent=2)

    print(f"[Whisper Alignment] Alignment JSON saved: {args.out_json}")

if __name__ == "__main__":
    main()
