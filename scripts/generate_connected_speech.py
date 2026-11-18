import urllib.request
import json
import time
import os

# Script adheres strictly to "C:\Users\majji\OneDrive\Desktop\Nouveau document texte (2).txt":
# 1. Word count: 47 words (within 40-50 range)
# 2. No hard punctuation (no ., no !, no ?)
# 3. Lowercase only
# 4. Suspended pitch pauses using '-' and '...'
# 5. Mid-clause breaks keeping the narration continuously connected
# 6. No hard line breaks
SPEECH_TEXT = (
    "you don't have to carry the weight of everything - "
    "because some things were never meant to be held ... "
    "and when you feel tired in a world that never stops - "
    "remember that healing is just learning to breathe ... "
    "so let your heavy thoughts rest - tomorrow will be kinder"
)

OUTPUT_FILE = "C:/Users/majji/whisprs_video_studio/audio/whisprs_video5_connected_raw.wav"
os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

url = "http://127.0.0.1:3900/v1/audio/speech"
payload = {
    "model": "tts-1",
    "input": SPEECH_TEXT,
    "voice": "2418c327",  # Profile name: "whisper"
    "response_format": "wav",
    "speed": 0.88  # Calm, slow, measured cadence
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)

print(f"Requesting connected speech synthesis from VoiceStudio (voice='whisper', speed=0.88)...")
print(f"Input Text:\n{SPEECH_TEXT}\n")
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
