import os
import sys
import time
import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel

REF_AUDIO = "C:/Users/majji/whisprs_video_studio/scratch/ref_clip_6s.wav"
REF_TEXT = "Just because you took longer than others, doesn't mean you failed."

TEXT = (
    "you don't have to carry the weight of everything - "
    "because some things were never meant to be held ... "
    "and when you feel tired in a world that never stops - "
    "remember that healing is just learning to breathe ... "
    "so let your heavy thoughts rest - tomorrow will be kinder"
)

OUT_FILE = "C:/Users/majji/whisprs_video_studio/audio/whisprs_new_qwen06_connected.wav"
os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)

print("======================================================")
print("[Qwen 0.6 Cloner] Loading Qwen 0.6B Base from HF...")
print(f"Device: cuda:0 | Torch: {torch.__version__}")
print(f"Target Text: {TEXT}")
print("======================================================")

t0 = time.time()
model_name = "Qwen/Qwen3-TTS-12Hz-0.6B-Base"
model = Qwen3TTSModel.from_pretrained(
    model_name,
    device_map="cuda:0",
    torch_dtype=torch.float32,
)
print(f"Model loaded in {time.time() - t0:.2f}s")

t1 = time.time()
print("Synthesizing cloned speech...")
wavs, sr = model.generate_voice_clone(
    text=TEXT,
    language="English",
    ref_audio=REF_AUDIO,
    ref_text=REF_TEXT,
)

sf.write(OUT_FILE, wavs[0], sr)
dur = len(wavs[0]) / sr
print(f"Generated {dur:.2f}s audio in {time.time() - t1:.2f}s -> {OUT_FILE}")
