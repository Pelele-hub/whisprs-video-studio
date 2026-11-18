import requests
import json
import time

url = "http://localhost:5678/webhook/generate-whisprs-v2"
payload = {
    "title": "You're Not Out of Time (Nano Banana Edition)",
    "hook": "Just because you took longer than others, doesn't mean you failed...",
    "category": "Patience & Healing"
}

print(f"Triggering {url} with payload:")
print(json.dumps(payload, indent=2))

start = time.time()
try:
    resp = requests.post(url, json=payload, timeout=300)
    print(f"Status Code: {resp.status_code}")
    print(f"Time Taken: {round(time.time() - start, 2)}s")
    try:
        data = resp.json()
        print("Response JSON:")
        print(json.dumps(data, indent=2))
    except Exception:
        print("Response Raw:", resp.text[:500])
except Exception as e:
    print("Error:", e)
