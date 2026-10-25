import subprocess
import time
import urllib.request
import os
import sys

port = 10000
env = os.environ.copy()
env["PORT"] = str(port)

os.makedirs("screenshots", exist_ok=True)
desktop_png = os.path.abspath("screenshots/desktop.png")
mobile_png = os.path.abspath("screenshots/mobile.png")
gujarati_png = os.path.abspath("screenshots/desktop_gujarati.png")
south_indian_png = os.path.abspath("screenshots/desktop_south_indian.png")

browser_exe = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

cmd = [
    sys.executable,
    "-m",
    "waitress",
    f"--listen=127.0.0.1:{port}",
    "--threads=4",
    "backend.app:app"
]

proc = subprocess.Popen(cmd, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

try:
    print("Waiting for server to start...")
    for _ in range(15):
        time.sleep(1)
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{port}/api/health")
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.getcode() == 200:
                    break
        except Exception:
            pass

    time.sleep(2)
    print("Server ready. Taking desktop screenshot (All)...")
    desk_cmd = [
        browser_exe,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1440,1200",
        "--virtual-time-budget=6000",
        f"--screenshot={desktop_png}",
        f"http://127.0.0.1:{port}/"
    ]
    subprocess.run(desk_cmd, check=True)
    print(f"Desktop screenshot saved to {desktop_png} ({os.path.getsize(desktop_png)} bytes)")

    print("Taking mobile screenshot...")
    mob_cmd = [
        browser_exe,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=390,950",
        "--virtual-time-budget=6000",
        f"--screenshot={mobile_png}",
        f"http://127.0.0.1:{port}/"
    ]
    subprocess.run(mob_cmd, check=True)
    print(f"Mobile screenshot saved to {mobile_png} ({os.path.getsize(mobile_png)} bytes)")

    print("Taking Gujarati cinema screenshot...")
    gu_cmd = [
        browser_exe,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1440,1200",
        "--virtual-time-budget=6000",
        f"--screenshot={gujarati_png}",
        f"http://127.0.0.1:{port}/?cinema=gu"
    ]
    subprocess.run(gu_cmd, check=True)
    print(f"Gujarati screenshot saved to {gujarati_png} ({os.path.getsize(gujarati_png)} bytes)")

    print("Taking South Indian cinema screenshot...")
    si_cmd = [
        browser_exe,
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1440,1200",
        "--virtual-time-budget=6000",
        f"--screenshot={south_indian_png}",
        f"http://127.0.0.1:{port}/?cinema=south_indian"
    ]
    subprocess.run(si_cmd, check=True)
    print(f"South Indian screenshot saved to {south_indian_png} ({os.path.getsize(south_indian_png)} bytes)")

finally:
    print("Shutting down server...")
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    print("Server stopped cleanly.")
