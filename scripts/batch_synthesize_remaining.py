import os, time, sys, torch, soundfile as sf
from qwen_tts import Qwen3TTSModel

REF_AUDIO = "C:/Users/majji/whisprs_video_studio/scratch/ref_clip_6s.wav"
REF_TEXT = "Just because you took longer than others, doesn't mean you failed."
AUDIO_DIR = "C:/Users/majji/whisprs_video_studio/audio"

ITEMS = [
    {
        "id": "reel_03",
        "file": os.path.join(AUDIO_DIR, "whisprs_batch10_reel_03_raw.wav"),
        "text": "You are not behind in life, you are simply on your own clock. The moon does not race the sun to prove its light. Be patient with the quiet seasons of your growth. Walk gently, let time carry what you were never meant to rush."
    },
    {
        "id": "reel_04",
        "file": os.path.join(AUDIO_DIR, "whisprs_batch10_reel_04_raw.wav"),
        "text": "Give yourself permission to pause. It is okay if today felt heavier than usual. You do not have to figure out everything tonight. Soften your shoulders, close your eyes, you made it through."
    },
    {
        "id": "reel_05",
        "file": os.path.join(AUDIO_DIR, "whisprs_batch10_reel_05_raw.wav"),
        "text": "Not every season is meant for blooming. Some seasons are just for staying rooted through the cold. Even in the quiet dark, you are still growing. Be proud of how far you've come, rest your tired heart tonight."
    },
    {
        "id": "reel_06",
        "file": os.path.join(AUDIO_DIR, "whisprs_batch10_reel_06_raw.wav"),
        "text": "Some days just making it to the night is a victory. You don't always need a lesson from the ache. Sometimes surviving is more than enough. Let go of the expectations, sleep peacefully tonight."
    },
    {
        "id": "reel_07",
        "file": os.path.join(AUDIO_DIR, "whisprs_batch10_reel_07_raw.wav"),
        "text": "Do not let the quiet hours convince you that you are alone. The world is loud, but your peace is sacred. Breathe in the stillness of this moment. You are worthy of rest, even when nothing is finished."
    },
    {
        "id": "reel_08",
        "file": os.path.join(AUDIO_DIR, "whisprs_batch10_reel_08_raw.wav"),
        "text": "Even the deepest ocean is calm beneath the surface. The storms above will pass, they always do. Let your mind settle like still water tonight. There is nothing to fight here, you are completely at peace."
    },
    {
        "id": "reel_09",
        "file": os.path.join(AUDIO_DIR, "whisprs_batch10_reel_09_raw.wav"),
        "text": "You have survived every hard day that came before this one, and you will make it through this one too. Lay your burdens down at the edge of the bed. Let sleep find you softly, tomorrow is waiting with new grace."
    },
    {
        "id": "reel_10",
        "file": os.path.join(AUDIO_DIR, "whisprs_batch10_reel_10_raw.wav"),
        "text": "Healing begins when you stop trying to fix everything at once. Some things will mend with time, not effort. Trust the quiet unfolding of your journey. Rest your thoughts tonight, everything is going to be alright."
    }
]

device = "cuda:0" if torch.cuda.is_available() else "cpu"
dtype = torch.float32

print(f"=== Starting Qwen 0.6B Batch TTS on {device} ===", flush=True)
t_start = time.time()
model = Qwen3TTSModel.from_pretrained(
    "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
    device_map=device,
    torch_dtype=dtype,
)
print(f"Model loaded in {time.time() - t_start:.2f}s", flush=True)

print("Precomputing voice clone prompt...", flush=True)
t_p = time.time()
prompt = model.create_voice_clone_prompt(ref_audio=REF_AUDIO, ref_text=REF_TEXT)
print(f"Voice clone prompt ready in {time.time() - t_p:.2f}s", flush=True)

for i, item in enumerate(ITEMS, 1):
    out_file = item["file"]
    if os.path.exists(out_file) and os.path.getsize(out_file) > 10000:
        print(f"[{i}/{len(ITEMS)}] Exists already: {out_file}", flush=True)
        continue

    print(f"\n[{i}/{len(ITEMS)}] Synthesizing {item['id']}...", flush=True)
    t0 = time.time()
    wavs, sr = model.generate_voice_clone(
        text=item["text"],
        language="English",
        voice_clone_prompt=prompt,
        max_new_tokens=220,
    )
    dur = len(wavs[0]) / sr
    sf.write(out_file, wavs[0], sr)
    gen_time = time.time() - t0
    print(f"[{i}/{len(ITEMS)}] DONE: Generated {dur:.2f}s audio in {gen_time:.2f}s -> {os.path.basename(out_file)}", flush=True)
    
    torch.cuda.empty_cache()

print(f"\n=== ALL 8 SPEECHES COMPLETE in {time.time() - t_start:.2f}s ===", flush=True)
