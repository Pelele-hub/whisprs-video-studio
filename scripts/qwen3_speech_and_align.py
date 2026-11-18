import os
import sys
import json
import argparse
import torch
import soundfile as sf

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", type=str, required=True, help="Saying text to synthesize")
    parser.add_argument("--out_wav", type=str, required=True, help="Output wav path")
    parser.add_argument("--out_json", type=str, required=True, help="Output alignment JSON path")
    args = parser.parse_args()

    REF_AUDIO = "C:/Users/majji/whisprs_video_studio/scratch/ref_clip_6s.wav"
    REF_TEXT = "Just because you took longer than others, doesn't mean you failed."

    print("======================================================")
    print("[Qwen3 Production] Synthesizing with Cloned Voice")
    print(f"Target Text: {args.text}")
    print("======================================================")

    from qwen_tts import Qwen3TTSModel

    device = "cuda:0" if torch.cuda.is_available() else "cpu"
    dtype = torch.bfloat16 if torch.cuda.is_available() else torch.float32
    print(f"[Qwen3] Device: {device} | Dtype: {dtype}")

    model_name = "Qwen/Qwen3-TTS-12Hz-0.6B-Base"
    model = Qwen3TTSModel.from_pretrained(
        model_name,
        device_map=device,
        torch_dtype=dtype,
    )

    wavs, sr = model.generate_voice_clone(
        text=args.text,
        language="English",
        ref_audio=REF_AUDIO,
        ref_text=REF_TEXT,
    )

    os.makedirs(os.path.dirname(args.out_wav), exist_ok=True)
    sf.write(args.out_wav, wavs[0], sr)
    duration = len(wavs[0]) / sr
    print(f"[Qwen3] Audio saved: {args.out_wav} (Duration: {duration:.2f}s)")

    # Speech alignment with faster-whisper
    print("[Qwen3 Alignment] Running Whisper word/phrase alignment...")
    from faster_whisper import WhisperModel
    whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
    segments, info = whisper_model.transcribe(args.out_wav, beam_size=5)

    alignment = []
    for s in segments:
        text = s.text.strip()
        if text:
            alignment.append({
                "start": round(s.start, 2),
                "end": round(s.end, 2),
                "text": text
            })
            print(f"   [{s.start:.2f}s -> {s.end:.2f}s] {text}")

    with open(args.out_json, "w", encoding="utf-8") as f:
        json.dump({
            "duration": duration,
            "alignment": alignment
        }, f, indent=2)

    print(f"[Qwen3 Alignment] Alignment JSON saved: {args.out_json}")

if __name__ == "__main__":
    main()
