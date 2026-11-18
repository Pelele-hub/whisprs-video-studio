import urllib.request
import json

try:
    with urllib.request.urlopen("http://127.0.0.1:3900/openapi.json") as resp:
        data = json.loads(resp.read().decode('utf-8'))
        paths = data.get("paths", {})
        print(f"Total endpoints: {len(paths)}")
        for path in sorted(paths.keys()):
            if any(k in path.lower() for k in ["voice", "clone", "speaker", "profile", "tts", "synthes", "audio", "preset"]):
                methods = list(paths[path].keys())
                print(f"  {methods} {path}")
except Exception as e:
    print("Error:", e)
