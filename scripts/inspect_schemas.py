import urllib.request
import json

with urllib.request.urlopen("http://127.0.0.1:3900/openapi.json") as resp:
    data = json.loads(resp.read().decode('utf-8'))

schemas = data.get("components", {}).get("schemas", {})
print("Body_generate_speech_generate_post:")
print(json.dumps(schemas.get("Body_generate_speech_generate_post"), indent=2))

print("\nSpeechRequest:")
print(json.dumps(schemas.get("SpeechRequest"), indent=2))
