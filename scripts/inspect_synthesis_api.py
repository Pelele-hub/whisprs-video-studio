import urllib.request
import json

with urllib.request.urlopen("http://127.0.0.1:3900/openapi.json") as resp:
    data = json.loads(resp.read().decode('utf-8'))

for path in ["/v1/audio/speech", "/profiles"]:
    if path in data["paths"]:
        print(f"=== {path} ===")
        print(json.dumps(data["paths"][path], indent=2))

# Also search for any post endpoint taking text and profile_id or voice
for path, methods in data["paths"].items():
    if "post" in methods:
        summary = methods["post"].get("summary", "")
        desc = methods["post"].get("description", "")
        if any(w in (path + summary + desc).lower() for w in ["speech", "synthes", "generate", "tts", "speak"]):
            print(f"POST {path}: {summary} ({desc[:80]}...)")
