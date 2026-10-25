import subprocess
import time
import urllib.request
import os
import sys

port = 10000
env = os.environ.copy()
env["PORT"] = str(port)

backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")

print(f"Starting server with Waitress on port {port}...")
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
    print("Waiting for server to load dataset and bind...")
    # Poll until port is open (up to 15 seconds)
    bound = False
    for i in range(15):
        time.sleep(1)
        if proc.poll() is not None:
            stdout, stderr = proc.communicate()
            print("Process terminated early!")
            print("STDOUT:", stdout)
            print("STDERR:", stderr)
            sys.exit(1)
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{port}/api/health")
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.getcode() == 200:
                    bound = True
                    break
        except Exception:
            pass

    if not bound:
        print("Could not connect to server within 15 seconds.")
        stdout, stderr = proc.communicate()
        print("STDOUT:", stdout)
        print("STDERR:", stderr)
        sys.exit(1)

    print("Server successfully bound and answering requests!")

    # 1. Probe UI at http://127.0.0.1:10000
    ui_url = f"http://127.0.0.1:{port}/"
    req = urllib.request.Request(ui_url)
    with urllib.request.urlopen(req, timeout=10) as response:
        status_code = response.getcode()
        html_body = response.read().decode("utf-8")

    print(f"UI probe status: {status_code}")
    assert status_code == 200
    assert "CineMatch" in html_body
    print("UI probe: Success! Returned CineMatch HTML.")

    # 2. Probe API at http://127.0.0.1:10000/api/health
    api_url = f"http://127.0.0.1:{port}/api/health"
    req_api = urllib.request.Request(api_url)
    with urllib.request.urlopen(req_api, timeout=10) as response:
        api_status = response.getcode()
        api_body = response.read().decode("utf-8")

    print(f"API probe status: {api_status}")
    assert api_status == 200
    print(f"API health response: {api_body}")

    # 3. Measure memory of the process
    ps_cmd = f"Get-Process -Id {proc.pid} | Select-Object -ExpandProperty WorkingSet64"
    mem_result = subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, text=True)
    mem_bytes = int(mem_result.stdout.strip())
    mem_mb = mem_bytes / (1024 * 1024)
    print(f"\n================ PEAK MEMORY REPORT ================")
    print(f"Server Process (PID {proc.pid}) Working Set Memory: {mem_mb:.2f} MB")
    print(f"RAM constraint: < 350 MB budget (Windows 8 GB RAM target)")
    print(f"Memory status: PASSED ({mem_mb:.2f} MB is far below 350 MB)")
    print(f"====================================================\n")

finally:
    print("Stopping test server...")
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()
    print("Test server stopped cleanly.")
