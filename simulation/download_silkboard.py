import urllib.request
import urllib.parse
import os

# Silk Board Junction Bounding Box
south = 12.9128
west = 77.6175
north = 12.9228
east = 77.6275

# Overpass QL query to download osm data
overpass_url = "http://overpass-api.de/api/interpreter"
overpass_query = f"""
[out:xml];
(
  way({south},{west},{north},{east})["highway"];
  node(w);
);
out body;
"""

print(f"Downloading OSM data for Silk Board Junction (BBox: {south},{west},{north},{east})...")

data = urllib.parse.urlencode({'data': overpass_query}).encode('utf-8')
req = urllib.request.Request(overpass_url, data=data)

try:
    with urllib.request.urlopen(req) as response:
        if response.status == 200:
            os.makedirs('nets/silkboard', exist_ok=True)
            with open('nets/silkboard/silkboard.osm', 'wb') as f:
                f.write(response.read())
            print("Download complete: nets/silkboard/silkboard.osm")
        else:
            print(f"Failed to download data: {response.status}")
except Exception as e:
    print(f"Error: {e}")
