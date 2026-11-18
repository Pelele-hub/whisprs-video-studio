import urllib.request
import json

with urllib.request.urlopen("http://127.0.0.1:3900/openapi.json") as resp:
    data = json.loads(resp.read().decode('utf-8'))

schemas = data.get("components", {}).get("schemas", {})

print("=== /generate details ===")
print(json.dumps(data["paths"].get("/generate"), indent=2))

generate_body_ref = data["paths"]["/generate"]["post"]["requestBody"]["content"]["application/json"]["schema"]["$ref"].split("/")[-1]
print(f"\n=== Schema for {generate_body_ref} ===")
print(json.dumps(schemas.get(generate_body_ref), indent=2))

print("\n=== /v1/audio/speech details ===")
print(json.dumps(data["paths"].get("/v1/audio/speech"), indent=2))
speech_ref = data["paths"]["/v1/audio/speech"]["post"]["requestBody"]["content"]["application/json"]["schema"]["$ref"].split("/")[-1]
print(f"\n=== Schema for {speech_ref} ===")
print(json.dumps(schemas.get(speech_ref), indent=2))
