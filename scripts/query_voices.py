import urllib.request
import json

def fetch(url):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return f"Error: {e}"

print("=== /profiles ===")
profiles = fetch("http://127.0.0.1:3900/profiles")
print(json.dumps(profiles, indent=2))

print("\n=== /gallery/voices ===")
gallery = fetch("http://127.0.0.1:3900/gallery/voices")
print(json.dumps(gallery, indent=2))

print("\n=== /v1/audio/voices ===")
voices = fetch("http://127.0.0.1:3900/v1/audio/voices")
print(json.dumps(voices, indent=2))
