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
rrr_modal_png = os.path.abspath("screenshots/desktop_rrr_modal.png")
rrr_mobile_png = os.path.abspath("screenshots/mobile_rrr_modal.png")

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
    print("Server ready. Capturing screenshots...")

    # 1. Desktop All
    subprocess.run([
        browser_exe, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--window-size=1440,1200", "--virtual-time-budget=6000",
        f"--screenshot={desktop_png}", f"http://127.0.0.1:{port}/"
    ], check=True)

    # 2. Mobile All
    subprocess.run([
        browser_exe, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--window-size=390,950", "--virtual-time-budget=6000",
        f"--screenshot={mobile_png}", f"http://127.0.0.1:{port}/"
    ], check=True)

    # 3. Gujarati Cinema
    subprocess.run([
        browser_exe, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--window-size=1440,1200", "--virtual-time-budget=6000",
        f"--screenshot={gujarati_png}", f"http://127.0.0.1:{port}/?cinema=gu"
    ], check=True)

    # 4. South Indian Cinema
    subprocess.run([
        browser_exe, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--window-size=1440,1200", "--virtual-time-budget=6000",
        f"--screenshot={south_indian_png}", f"http://127.0.0.1:{port}/?cinema=south_indian"
    ], check=True)

    # 5. RRR Multi-language Trailer Modal Desktop
    subprocess.run([
        browser_exe, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--window-size=1440,1200", "--virtual-time-budget=6000",
        f"--screenshot={rrr_modal_png}", f"http://127.0.0.1:{port}/?movie=579974"
    ], check=True)

    # 6. RRR Multi-language Trailer Modal Mobile
    subprocess.run([
        browser_exe, "--headless=new", "--disable-gpu", "--hide-scrollbars",
        "--window-size=390,950", "--virtual-time-budget=6000",
        f"--screenshot={rrr_mobile_png}", f"http://127.0.0.1:{port}/?movie=579974"
    ], check=True)

    print("All screenshots successfully captured!")

finally:
    print("Shutting down server...")
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    print("Server stopped cleanly.")
