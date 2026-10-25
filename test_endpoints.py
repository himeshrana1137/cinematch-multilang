import sys
import json
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend"))
from app import app, recommender

client = app.test_client()

print("Testing CineMatch Endpoints...")

# 1. /api/health
res = client.get("/api/health")
print(f"1. /api/health: status={res.status_code}")
assert res.status_code == 200
health_data = res.get_json()
print("   Health payload:", health_data)
assert health_data["total_movies"] > 0
assert health_data["available_languages"] >= 10

# 2. /api/languages
res = client.get("/api/languages")
print(f"2. /api/languages: status={res.status_code}")
assert res.status_code == 200
languages = res.get_json()
print(f"   Languages returned ({len(languages)}):", [l["code"] for l in languages])
# Verify 'gu' is present
gu_lang = next((l for l in languages if l["code"] == "gu"), None)
print(f"   Gujarati (gu) language count:", gu_lang)
assert gu_lang is not None
assert gu_lang["count"] > 0

# 3. /api/search
res = client.get("/api/search?q=love&languages=hi,gu")
print(f"3. /api/search?q=love&languages=hi,gu: status={res.status_code}")
assert res.status_code == 200
search_results = res.get_json()
print(f"   Search results count: {len(search_results)}")
if search_results:
    sample = search_results[0]
    print(f"   Sample match: {sample['title']} ({sample['language_name']}, {sample['year']})")
    assert sample["language"] in ["hi", "gu"]

# 4. /api/popular with languages=gu
res = client.get("/api/popular?languages=gu&n=5")
print(f"4. /api/popular?languages=gu&n=5: status={res.status_code}")
assert res.status_code == 200
gu_popular = res.get_json()
print(f"   Gujarati popular count: {len(gu_popular)}")
assert len(gu_popular) > 0
for m in gu_popular:
    assert m["language"] == "gu"
    print(f"     - {m['title']} (Rating: {m['tmdb_rating']}, Year: {m['year']})")

# 5. /api/popular with languages=hi,gu
res = client.get("/api/popular?languages=hi,gu&n=12")
print(f"5. /api/popular?languages=hi,gu&n=12: status={res.status_code}")
assert res.status_code == 200
hi_gu_popular = res.get_json()
assert len(hi_gu_popular) == 12

# 6. /api/movie/<id>
# Pick first movie
first_movie = recommender.movies[0]
mid = first_movie["id"]
res = client.get(f"/api/movie/{mid}")
print(f"6. /api/movie/{mid} ({first_movie['title']}): status={res.status_code}")
assert res.status_code == 200
detail = res.get_json()
print(f"   Movie details fields:", list(detail.keys()))
assert "cast" in detail
assert "trailer_key" in detail
assert "director" in detail

# 7. Check a movie without a trailer
movie_without_trailer = next((m for m in recommender.movies if not m.get("trailer_key")), None)
if movie_without_trailer:
    res = client.get(f"/api/movie/{movie_without_trailer['id']}")
    print(f"7. /api/movie/<id> WITHOUT trailer ({movie_without_trailer['title']}): status={res.status_code}")
    assert res.status_code == 200
    no_trailer_data = res.get_json()
    assert no_trailer_data["trailer_key"] is None
    print(f"   Confirmed movie ID {movie_without_trailer['id']} has trailer_key: {no_trailer_data['trailer_key']}")

# 8. /api/recommend
res = client.get(f"/api/recommend?movie_id={mid}&languages=hi,ta&n=12&alpha=0.7")
print(f"8. /api/recommend?movie_id={mid}&languages=hi,ta&n=12&alpha=0.7: status={res.status_code}")
assert res.status_code == 200
recs = res.get_json()
print(f"   Recommendations count: {len(recs)}")
assert len(recs) > 0
for r in recs[:3]:
    print(f"     -> {r['title']} ({r['language_name']}) - {r['match_percent']}% Match")
    assert r["language"] in ["hi", "ta"]

# 9. Verify 400 Bad Request
res = client.get("/api/recommend")
print(f"9. /api/recommend (missing movie_id): status={res.status_code}")
assert res.status_code == 400

# 10. Verify 404 Not Found
res = client.get("/api/movie/999999999")
print(f"10. /api/movie/999999999 (non-existent): status={res.status_code}")
assert res.status_code == 404

# 11. Verify Static Frontend Serving
res = client.get("/")
print(f"11. GET / (Frontend dist index.html): status={res.status_code}")
assert res.status_code == 200
assert b"<div id=\"root\">" in res.data
print("    Frontend successfully served by Flask backend!")

print("\nALL ENDPOINT TESTS PASSED SUCCESSFULLY!")
