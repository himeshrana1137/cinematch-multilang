import subprocess
import time
import urllib.request
import json
import os
import sys
import psutil

# Ensure we run and launch from inside backend/
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
port = 10000
env = os.environ.copy()
env["PORT"] = str(port)

print("=" * 60)
print("1. VERIFYING RENDER STARTUP & ACCURATE PSUTIL RSS MEMORY")
print("=" * 60)
print(f"Working directory for server: {backend_dir}")

# Command equivalent to: waitress-serve --listen=127.0.0.1:10000 app:app
# run from inside backend/ directory
cmd = [
    sys.executable,
    "-m",
    "waitress",
    f"--listen=127.0.0.1:{port}",
    "--threads=4",
    "app:app"
]

proc = subprocess.Popen(cmd, cwd=backend_dir, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

try:
    print(f"Server launched with PID {proc.pid}. Waiting for readiness...")
    ready = False
    for i in range(15):
        time.sleep(1)
        if proc.poll() is not None:
            stdout, stderr = proc.communicate()
            print("Process terminated prematurely!")
            print("STDOUT:", stdout)
            print("STDERR:", stderr)
            sys.exit(1)
        try:
            req = urllib.request.Request(f"http://127.0.0.1:{port}/api/health")
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.getcode() == 200:
                    ready = True
                    break
        except Exception:
            pass

    if not ready:
        print("Failed to connect to server on port 10000 within 15 seconds.")
        sys.exit(1)

    print("Server successfully running on port 10000!\n")

    # 1. Test /api/health
    print("Testing GET /api/health...")
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/health", timeout=5) as resp:
        health_data = json.loads(resp.read().decode())
        print(f"  [PASS] /api/health: {health_data}")
        assert health_data["total_movies"] > 0

    # 2. Test Home Page (serves frontend/dist/index.html)
    print("Testing GET / (Home Page)...")
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=5) as resp:
        html = resp.read().decode()
        print(f"  [PASS] GET / returned {resp.getcode()} (length: {len(html)} bytes)")
        assert "CineMatch" in html

    # 3. Test /api/popular
    print("Testing GET /api/popular...")
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/popular", timeout=5) as resp:
        pop_data = json.loads(resp.read().decode())
        print(f"  [PASS] /api/popular returned {len(pop_data)} movies. Sample: '{pop_data[0]['title']}'")
        assert len(pop_data) > 0

    # 4. Test /api/recommend?movie_id=579974 (RRR)
    print("Testing GET /api/recommend?movie_id=579974...")
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/recommend?movie_id=579974", timeout=5) as resp:
        recs_data = json.loads(resp.read().decode())
        print(f"  [PASS] /api/recommend returned {len(recs_data)} recommendations. Top match: '{recs_data[0]['title']}' ({recs_data[0]['match_percent']}%)")
        assert len(recs_data) > 0

    # 5. Test /api/movie/579974 (RRR details & trailers)
    print("Testing GET /api/movie/579974...")
    with urllib.request.urlopen(f"http://127.0.0.1:{port}/api/movie/579974", timeout=5) as resp:
        movie_data = json.loads(resp.read().decode())
        print(f"  [PASS] /api/movie/579974 returned '{movie_data['title']}' with {len(movie_data.get('trailers', []))} trailers")
        assert len(movie_data.get("trailers", [])) > 0

    # 6. Measure accurate Real RSS Memory with psutil
    main_proc = psutil.Process(proc.pid)
    total_rss_bytes = main_proc.memory_info().rss
    process_list = [(proc.pid, main_proc.name(), main_proc.memory_info().rss)]

    try:
        children = main_proc.children(recursive=True)
        for child in children:
            child_rss = child.memory_info().rss
            total_rss_bytes += child_rss
            process_list.append((child.pid, child.name(), child_rss))
    except Exception as e:
        print(f"Note on inspecting child processes: {e}")

    total_rss_mb = total_rss_bytes / (1024 * 1024)

    print("\n" + "=" * 60)
    print("REAL RESIDENT MEMORY (RSS) REPORT")
    print("=" * 60)
    for p_id, p_name, p_rss in process_list:
        print(f"Process PID {p_id} ({p_name}): {p_rss / (1024 * 1024):.2f} MB RSS")
    print(f"TOTAL REAL RSS MEMORY: {total_rss_mb:.2f} MB")
    print(f"MEMORY BUDGET: 350.00 MB")
    if total_rss_mb <= 350.0:
        print(f"STATUS: PASSED (Headroom: {350.0 - total_rss_mb:.2f} MB remaining)")
    else:
        print(f"STATUS: EXCEEDED BUDGET BY {total_rss_mb - 350.0:.2f} MB")
    print("=" * 60 + "\n")

    assert total_rss_mb <= 350.0, f"Memory exceeded 350 MB! ({total_rss_mb:.2f} MB)"

finally:
    print("Shutting down server...")
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except Exception:
        proc.kill()
    print("Server stopped cleanly.")
