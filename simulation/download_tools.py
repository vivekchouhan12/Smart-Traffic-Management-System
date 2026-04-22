import urllib.request
import os

url = "https://raw.githubusercontent.com/eclipse-sumo/sumo/main/tools/randomTrips.py"

print("Downloading randomTrips.py...")
try:
    with urllib.request.urlopen(url) as response:
        with open("randomTrips.py", "wb") as f:
            f.write(response.read())
    print("Download complete.")
except Exception as e:
    print(f"Error downloading: {e}")
