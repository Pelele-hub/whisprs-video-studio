import os
import sys
import time
import torch
import soundfile as sf
from qwen_tts import Qwen3TTSModel

REF_AUDIO = "C:/Users/majji/whisprs_video_studio/scratch/ref_clip_6s.wav"
REF_TEXT = "Just because you took longer than others, doesn't mean you failed."

SCRIPTS = [
    {
        "id": "v6_speech1",
        "text": (
            "not everything that feels lost is truly gone - "
            "sometimes the quiet is just making room for you to breathe ... "
            "you don't have to explain why you are silent tonight - "
            "just let the world spin without you - you are safe here"
        ),
        "out": "C:/Users/majji/whisprs_video_studio/audio/whisprs_v6_speech1_raw.wav"
    },
    {
        "id": "v6_speech2",
        "text": (
            "you have been strong for so long that you forgot how to rest - "
            "it is okay to put the shield down ... "
            "nobody is expecting you to hold the sky up by yourself - "
            "tonight forgive yourself for being human - tomorrow is a new beginning"
        ),
        "out": "C:/Users/majji/whisprs_video_studio/audio/whisprs_v6_speech2_raw.wav"
    }
]

print("======================================================")
print("[Qwen 0.6 Cloner] Loading model for 2 Brand New Speeches")
print("======================================================")

device = "cuda:0" if torch.cuda.is_available() else "cpu"
dtype = torch.float32

model_name = "Qwen/Qwen3-TTS-12Hz-0.6B-Base"
t0 = time.time()
model = Qwen3TTSModel.from_pretrained(
    model_name,
    device_map=device,
    torch_dtype=dtype,
)
print(f"Model loaded in {time.time() - t0:.2f}s")

for item in SCRIPTS:
    print(f"\n--- Generating Speech: {item['id']} ---")
    print(f"Text: {item['text']}")
    t1 = time.time()
    wavs, sr = model.generate_voice_clone(
        text=item["text"],
        language="English",
        ref_audio=REF_AUDIO,
        ref_text=REF_TEXT,
    )
    os.makedirs(os.path.dirname(item["out"]), exist_ok=True)
    sf.write(item["out"], wavs[0], sr)
    dur = len(wavs[0]) / sr
    print(f"Generated {dur:.2f}s audio in {time.time() - t1:.2f}s -> {item['out']}")

print("\nAll 2 speeches synthesized successfully!")
