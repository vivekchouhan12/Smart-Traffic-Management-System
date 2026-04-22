import urllib.request
import os

def download_file(url, filename):
    print(f"Downloading {filename}...")
    try:
        urllib.request.urlretrieve(url, filename)
        print(f"Successfully downloaded {filename}")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")

if __name__ == "__main__":
    base_url = "https://raw.githubusercontent.com/LucasAlegre/sumo-rl/main/nets/2x2grid/"
    files = {
        "2x2.net.xml": "2x2.net.xml",
        "2x2.rou.xml": "2x2.rou.xml",
        "2x2.sumocfg": "2x2.sumocfg"
    }

    net_dir = os.path.join(os.path.dirname(__file__), "nets", "2x2grid")
    os.makedirs(net_dir, exist_ok=True)

    for remote, local in files.items():
        download_file(base_url + remote, os.path.join(net_dir, local))
        
    print("Downloaded 2x2 grid network successfuly.")
