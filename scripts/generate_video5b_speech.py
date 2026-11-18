import urllib.request
import json
import time
import os

SPEECH_TEXT = (
    "You don't have to carry the weight of everything you cannot change. "
    "It's okay to feel tired in a world that never stops moving. "
    "Healing is not a race; it is simply learning to breathe again. "
    "Give yourself grace for the silent battles nobody ever saw. "
    "Tonight, let your heavy thoughts rest, and trust that tomorrow will be kinder."
)

OUTPUT_FILE = "C:/Users/majji/whisprs_video_studio/audio/whisprs_video5b_raw.wav"
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

url = "http://127.0.0.1:3900/v1/audio/speech"
payload = {
    "model": "tts-1",
    "input": SPEECH_TEXT,
    "voice": "2418c327",  # Profile name: "whisper"
    "response_format": "wav",
    "speed": 0.88  # Slightly slower reading speed (calm, measured, contemplative)
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)

print(f"Requesting speech synthesis from VoiceStudio (speed=0.88, voice='whisper')...")
t0 = time.time()
try:
    with urllib.request.urlopen(req, timeout=300) as resp:
        audio_data = resp.read()
        duration_s = time.time() - t0
        print(f"Success! Received {len(audio_data):,} bytes in {duration_s:.1f}s")
        with open(OUTPUT_FILE, "wb") as f:
            f.write(audio_data)
        print(f"Saved audio to: {OUTPUT_FILE}")
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
