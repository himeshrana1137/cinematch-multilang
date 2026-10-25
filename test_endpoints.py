import sys
import os

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
from app import app, recommender

client = app.test_client()

print("Running CineMatch Verification & Multi-Language Trailer Tests...\n")

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
assert set(lang_codes) == {"en", "hi", "gu", "ta", "te", "ml", "kn"}

# 3. Test Telugu Blockbuster (RRR, ID 579974)
rrr_id = 579974
res = client.get(f"/api/movie/{rrr_id}")
assert res.status_code == 200
rrr_data = res.get_json()
print(f"[PASS] 3. /api/movie/{rrr_id} (RRR - Telugu Blockbuster):")
print(f"       Title: {rrr_data['title']}")
print(f"       Original Language: {rrr_data['original_language_name']}")
print(f"       Default Trailer Key: {rrr_data['default_trailer_key']}")
print(f"       Multi-Language Trailers Count: {len(rrr_data.get('trailers', []))}")
assert len(rrr_data.get("trailers", [])) >= 3
for t in rrr_data.get("trailers", []):
    print(f"         - {t['lang_name']} ({t['lang']}): key={t['key']}, is_original={t['is_original']}")
# Verify original language (Telugu) is first
assert rrr_data["trailers"][0]["lang"] == "te"
assert rrr_data["trailers"][0]["is_original"] is True

# 4. Test Hindi Movie (e.g. Krrish 3 or Dangal or Jawan)
hindi_movie = next((m for m in recommender.movies if m["language"] == "hi" and m.get("trailers")), None)
assert hindi_movie is not None
res = client.get(f"/api/movie/{hindi_movie['id']}")
assert res.status_code == 200
hi_data = res.get_json()
print(f"[PASS] 4. /api/movie/{hindi_movie['id']} ({hi_data['title']} - Hindi Movie):")
print(f"       Original Language: {hi_data['original_language_name']}")
print(f"       Trailers ({len(hi_data.get('trailers', []))}): {[t['lang_name'] for t in hi_data.get('trailers', [])]}")
assert len(hi_data.get("trailers", [])) > 0

# 5. Test Tamil Movie (e.g. Leo, Jailer, Vikram)
tamil_movie = next((m for m in recommender.movies if m["language"] == "ta" and m.get("trailers")), None)
assert tamil_movie is not None
res = client.get(f"/api/movie/{tamil_movie['id']}")
assert res.status_code == 200
ta_data = res.get_json()
print(f"[PASS] 5. /api/movie/{tamil_movie['id']} ({ta_data['title']} - Tamil Movie):")
print(f"       Original Language: {ta_data['original_language_name']}")
print(f"       Trailers ({len(ta_data.get('trailers', []))}): {[t['lang_name'] for t in ta_data.get('trailers', [])]}")
assert len(ta_data.get("trailers", [])) > 0

# 6. Test Gujarati Movie Without a Trailer
gu_no_trailer = next((m for m in recommender.movies if m["language"] == "gu" and not m.get("trailers")), None)
assert gu_no_trailer is not None
res = client.get(f"/api/movie/{gu_no_trailer['id']}")
assert res.status_code == 200
gu_data = res.get_json()
print(f"[PASS] 6. /api/movie/{gu_no_trailer['id']} ({gu_data['title']} - Gujarati Movie WITHOUT trailer):")
print(f"       Trailers list: {gu_data.get('trailers')}")
print(f"       default_trailer_key: {gu_data.get('default_trailer_key')}")
assert gu_data.get("trailers") == []
assert gu_data.get("default_trailer_key") is None

# 7. Static frontend index.html served on /
res = client.get("/")
assert res.status_code == 200
assert b"<div id=\"root\">" in res.data
print("[PASS] 7. Static frontend served correctly from frontend/dist")

print("\nALL VERIFICATION TESTS COMPLETED SUCCESSFULLY!")
