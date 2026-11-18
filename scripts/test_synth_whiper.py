import urllib.request
import json
import time

url = "http://127.0.0.1:3900/v1/audio/speech"
payload = {
    "model": "tts-1",
    "input": "This is a test of the cloned voice named whisper in VoiceStudio.",
    "voice": "2418c327",
    "response_format": "wav",
    "speed": 1.0
}

req = urllib.request.Request(
    url,
    data=json.dumps(payload).encode('utf-8'),
    headers={"Content-Type": "application/json"}
)

print("Sending speech generation request to VoiceStudio...")
t0 = time.time()
try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        audio_data = resp.read()
        print(f"Success! Received {len(audio_data)} bytes in {time.time()-t0:.2f}s")
        with open("C:/Users/majji/whisprs_video_studio/scratch/test_voice_whiper.wav", "wb") as f:
            f.write(audio_data)
        print("Saved to C:/Users/majji/whisprs_video_studio/scratch/test_voice_whiper.wav")
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} - {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Exception: {e}")
