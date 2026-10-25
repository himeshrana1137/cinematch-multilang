import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
from app import app, recommender

client = app.test_client()

print("Running CineMatch Verification Tests...\n")

# 1. /api/health
res = client.get("/api/health")
assert res.status_code == 200
health_data = res.get_json()
print(f"[PASS] 1. /api/health: {health_data['total_movies']} movies, {health_data['available_languages']} languages")

# 2. /api/languages
res = client.get("/api/languages")
assert res.status_code == 200
languages = res.get_json()
lang_codes = [l["code"] for l in languages]
print(f"[PASS] 2. /api/languages: returned {lang_codes}")
# Ensure bn, mr, pa are removed
assert "bn" not in lang_codes
assert "mr" not in lang_codes
assert "pa" not in lang_codes
assert set(lang_codes) == {"en", "hi", "gu", "ta", "te", "ml", "kn"}
gu_info = next(l for l in languages if l["code"] == "gu")
hi_info = next(l for l in languages if l["code"] == "hi")
print(f"       Hindi count: {hi_info['count']}, Gujarati count: {gu_info['count']}")

# 3. /api/popular?languages=gu
res = client.get("/api/popular?languages=gu&n=6")
assert res.status_code == 200
gu_popular = res.get_json()
print(f"[PASS] 3. /api/popular?languages=gu ({len(gu_popular)} movies returned):")
for m in gu_popular:
    assert m["language"] == "gu"
    print(f"       - {m['title']} (Rating: {m['tmdb_rating']}, Votes: {m['vote_count']})")

# 4. /api/popular?languages=ta,te,ml,kn (South Indian)
res = client.get("/api/popular?languages=ta,te,ml,kn&n=8")
assert res.status_code == 200
si_popular = res.get_json()
print(f"[PASS] 4. /api/popular?languages=ta,te,ml,kn ({len(si_popular)} movies returned):")
for m in si_popular:
    assert m["language"] in ["ta", "te", "ml", "kn"]
    print(f"       - {m['title']} ({m['language_name']}, Rating: {m['tmdb_rating']})")

# 5. /api/recommend with languages=hi (no alpha parameter)
first_hindi = next(m for m in recommender.movies if m["language"] == "hi")
res = client.get(f"/api/recommend?movie_id={first_hindi['id']}&languages=hi&n=6")
assert res.status_code == 200
recs = res.get_json()
print(f"[PASS] 5. /api/recommend for '{first_hindi['title']}' with languages=hi (no alpha sent):")
for r in recs:
    assert r["language"] == "hi"
    print(f"       -> {r['title']} - {r['match_percent']}% Match")

# 6. /api/movie/<id>
res = client.get(f"/api/movie/{first_hindi['id']}")
assert res.status_code == 200
detail = res.get_json()
assert "cast" in detail
assert "director" in detail
assert "trailer_key" in detail
print(f"[PASS] 6. /api/movie/{first_hindi['id']} detail card verified (Director: {detail['director']})")

# 7. Static frontend index.html served on /
res = client.get("/")
assert res.status_code == 200
assert b"<div id=\"root\">" in res.data
print("[PASS] 7. Static frontend served correctly from frontend/dist")

print("\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!")
