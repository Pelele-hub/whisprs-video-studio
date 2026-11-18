import urllib.request
import sys

sys.stdout.reconfigure(encoding='utf-8')

try:
    with urllib.request.urlopen("http://127.0.0.1:3900/system/logs?lines=30") as resp:
        print(resp.read().decode('utf-8', errors='ignore'))
except Exception as e:
    print("Error:", e)

