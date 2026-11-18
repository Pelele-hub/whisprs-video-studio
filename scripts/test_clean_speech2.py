import os
import time
import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel

REF_AUDIO = "C:/Users/majji/whisprs_video_studio/scratch/ref_clip_6s.wav"
REF_TEXT = "Just because you took longer than others, doesn't mean you failed."

TEXT_2 = "You have been strong for so long that you forgot how to rest. It is okay to put the shield down. Nobody is expecting you to hold the sky up by yourself. Tonight, forgive yourself for being human. Tomorrow is a new beginning."

device = "cuda:0" if torch.cuda.is_available() else "cpu"
dtype = torch.float32

model_name = "Qwen/Qwen3-TTS-12Hz-0.6B-Base"
print(f"Loading {model_name} on {device}...")
model = Qwen3TTSModel.from_pretrained(
    model_name,
    device_map=device,
    torch_dtype=dtype,
)

print("Synthesizing clean Speech 2...")
wavs, sr = model.generate_voice_clone(
    text=TEXT_2,
    language="English",
    ref_audio=REF_AUDIO,
    ref_text=REF_TEXT,
)

out_path = "C:/Users/majji/whisprs_video_studio/audio/whisprs_v6_speech2_clean_raw.wav"
sf.write(out_path, wavs[0], sr)
print(f"Saved: {out_path} ({len(wavs[0])/sr:.2f}s)")
