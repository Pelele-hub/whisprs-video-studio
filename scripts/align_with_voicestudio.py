import urllib.request
import json
import mimetypes
import uuid
import re

WAV_PATH = "C:/Users/majji/whisprs_video_studio/audio/whisprs_video4_voicestudio_raw.wav"
OUT_JSON = "C:/Users/majji/whisprs_video_studio/output/whisprs_video4_alignment.json"

boundary = f"----WebKitFormBoundary{uuid.uuid4().hex}"

with open(WAV_PATH, "rb") as f:
    wav_bytes = f.read()

body = bytearray()
def add_field(name, value):
    body.extend(f"--{boundary}\r\n".encode())
    body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode())
    body.extend(f"{value}\r\n".encode())

add_field("model", "whisper-1")
add_field("response_format", "verbose_json")
add_field("timestamp_granularities[]", "word")
add_field("timestamp_granularities[]", "segment")

body.extend(f"--{boundary}\r\n".encode())
body.extend(f'Content-Disposition: form-data; name="file"; filename="audio.wav"\r\n'.encode())
body.extend(b"Content-Type: audio/wav\r\n\r\n")
body.extend(wav_bytes)
body.extend(b"\r\n")
body.extend(f"--{boundary}--\r\n".encode())

req = urllib.request.Request(
    "http://127.0.0.1:3900/v1/audio/transcriptions",
    data=bytes(body),
    headers={
        "Content-Type": f"multipart/form-data; boundary={boundary}"
    }
)

print(f"Transcribing {WAV_PATH} via VoiceStudio API...")
try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read().decode('utf-8'))
        print("Transcription successful!")
        print(f"Text: {result.get('text')}")
        print(f"Duration: {result.get('duration')}s")
        print(f"Segments: {len(result.get('segments', []))}")
        print(f"Words: {len(result.get('words', []))}")

        # Save raw result
        with open(OUT_JSON, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        print(f"Saved alignment to: {OUT_JSON}")
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}: {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Error: {e}")
