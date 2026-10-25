import os
import sys
import json
import time
import math
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from dotenv import load_dotenv

# Ensure backend directory is in path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BACKEND_DIR, "data")
CACHE_FILE = os.path.join(DATA_DIR, "tmdb_cache.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "movies.json")

# Load environment variables (TMDB_API_KEY from backend/.env)
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

if not TMDB_API_KEY or TMDB_API_KEY == "your_key_here":
    print("ERROR: TMDB_API_KEY not configured in backend/.env", file=sys.stderr)
    sys.exit(1)

BASE_URL = "https://api.themoviedb.org/3"

# Language configuration as requested
# Languages: en (Hollywood), hi (Bollywood/Hindi), gu (Gujarati),
# ta (Tamil), te (Telugu/Tollywood), ml (Malayalam), kn (Kannada),
# mr (Marathi), bn (Bengali), pa (Punjabi).
# vote_count.gte: en/hi 50, ta/te/ml 10, kn/mr/bn/pa 5, gu 1
# Pages: en 30, hi 30, ta 25, te 25, ml 25, kn 15, bn 10, mr 10, pa 10. (for gu take all available)
LANG_CONFIG = {
    "en": {"name": "Hollywood", "min_vote": 50, "pages": 30},
    "hi": {"name": "Bollywood/Hindi", "min_vote": 50, "pages": 30},
    "ta": {"name": "Tamil", "min_vote": 10, "pages": 25},
    "te": {"name": "Telugu", "min_vote": 10, "pages": 25},
    "ml": {"name": "Malayalam", "min_vote": 10, "pages": 25},
    "kn": {"name": "Kannada", "min_vote": 5, "pages": 15},
    "bn": {"name": "Bengali", "min_vote": 5, "pages": 10},
    "mr": {"name": "Marathi", "min_vote": 5, "pages": 10},
    "pa": {"name": "Punjabi", "min_vote": 5, "pages": 10},
    "gu": {"name": "Gujarati", "min_vote": 1, "pages": 50},  # All available pages
}

session = requests.Session()


def request_with_retry(url, params=None, max_retries=4, timeout=5):
    for attempt in range(max_retries):
        try:
            resp = session.get(url, params=params, timeout=timeout)
            if resp.status_code == 200:
                return resp.json()
            elif resp.status_code == 429:
                retry_after = int(resp.headers.get("Retry-After", 1))
                time.sleep(retry_after + 0.5)
            elif resp.status_code in (500, 502, 503, 504):
                time.sleep(0.5 * (2 ** attempt))
            else:
                return None
        except Exception:
            time.sleep(0.5 * (2 ** attempt))
    return None


def fetch_discover_ids(lang_code, config):
    movie_ids = []
    target_pages = config["pages"]
    min_vote = config["min_vote"]
    
    print(f"Discovering {config['name']} ({lang_code}) movies (target up to {target_pages} pages, min votes {min_vote})...")
    
    for page in range(1, target_pages + 1):
        params = {
            "api_key": TMDB_API_KEY,
            "with_original_language": lang_code,
            "sort_by": "popularity.desc",
            "vote_count.gte": min_vote,
            "page": page,
        }
        data = request_with_retry(f"{BASE_URL}/discover/movie", params=params)
        if not data:
            break
        
        results = data.get("results", [])
        if not results:
            break
            
        for item in results:
            mid = item.get("id")
            if mid:
                movie_ids.append((mid, lang_code))
                
        total_pages = data.get("total_pages", 1)
        if page >= total_pages:
            break
            
        time.sleep(0.05)
        
    print(f"  Found {len(movie_ids)} candidate IDs for {lang_code}.")
    return movie_ids


def parse_movie_details(data, lang_code):
    if not data:
        return None
        
    overview = (data.get("overview") or "").strip()
    poster_path = data.get("poster_path")
    poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
    
    # Skip movies with no overview AND no poster
    if not overview and not poster_url:
        return None
        
    mid = data.get("id")
    title = data.get("title") or data.get("original_title") or "Unknown"
    orig_title = data.get("original_title") or title
    
    release_date = data.get("release_date") or ""
    year = None
    if len(release_date) >= 4 and release_date[:4].isdigit():
        year = int(release_date[:4])
        
    backdrop_path = data.get("backdrop_path")
    backdrop_url = f"https://image.tmdb.org/t/p/w1280{backdrop_path}" if backdrop_path else None
    
    genres = [g["name"] for g in data.get("genres", []) if g.get("name")]
    
    # Cast (top 6 with name, character, w185 photo)
    credits = data.get("credits") or {}
    raw_cast = credits.get("cast", [])[:6]
    cast = []
    for c in raw_cast:
        p_path = c.get("profile_path")
        cast.append({
            "name": c.get("name", ""),
            "character": c.get("character", ""),
            "profile_url": f"https://image.tmdb.org/t/p/w185{p_path}" if p_path else None
        })
        
    # Director
    director = None
    for crew_member in credits.get("crew", []):
        if crew_member.get("job") == "Director":
            director = crew_member.get("name")
            break
            
    # Keywords
    kw_raw = data.get("keywords") or {}
    kw_items = kw_raw.get("keywords") if isinstance(kw_raw.get("keywords"), list) else kw_raw.get("results", [])
    keywords = [k.get("name") for k in (kw_items or []) if isinstance(k, dict) and k.get("name")]
    
    # Trailer key: official YouTube Trailer, else Teaser, else null
    vids = (data.get("videos") or {}).get("results", [])
    youtube_vids = [v for v in vids if v.get("site") == "YouTube"]
    trailer_key = None
    for v in youtube_vids:
        if v.get("type") == "Trailer" and v.get("official") is True and v.get("key"):
            trailer_key = v["key"]
            break
    if not trailer_key:
        for v in youtube_vids:
            if v.get("type") == "Trailer" and v.get("key"):
                trailer_key = v["key"]
                break
    if not trailer_key:
        for v in youtube_vids:
            if v.get("type") == "Teaser" and v.get("key"):
                trailer_key = v["key"]
                break

    lang_name = LANG_CONFIG.get(lang_code, {}).get("name", lang_code)
    
    return {
        "id": mid,
        "title": title,
        "original_title": orig_title,
        "year": year,
        "language": lang_code,
        "language_name": lang_name,
        "genres": genres,
        "overview": overview[:500],  # Shorten to 500 chars to keep file compact
        "tagline": (data.get("tagline") or "").strip()[:200],
        "runtime": data.get("runtime"),
        "vote_average": round(float(data.get("vote_average", 0.0)), 1),
        "vote_count": int(data.get("vote_count", 0)),
        "popularity": round(float(data.get("popularity", 0.0)), 2),
        "poster_url": poster_url,
        "backdrop_url": backdrop_url,
        "cast": cast,
        "director": director,
        "keywords": keywords[:15],
        "trailer_key": trailer_key
    }


def fetch_movie_detail(mid, lang_code, cache):
    mid_str = str(mid)
    if mid_str in cache:
        return cache[mid_str]
        
    params = {
        "api_key": TMDB_API_KEY,
        "append_to_response": "credits,keywords,videos"
    }
    url = f"{BASE_URL}/movie/{mid}"
    raw_json = request_with_retry(url, params=params, timeout=5)
    parsed = parse_movie_details(raw_json, lang_code)
    return parsed


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Load cache if available
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
            print(f"Loaded {len(cache)} cached movies from {CACHE_FILE}")
        except Exception as e:
            print(f"Could not load cache: {e}")
            cache = {}
            
    # 1. Discover movies for all languages
    all_candidate_ids = []
    seen_ids = set()
    for lang_code, config in LANG_CONFIG.items():
        lang_ids = fetch_discover_ids(lang_code, config)
        for mid, lcode in lang_ids:
            if mid not in seen_ids:
                seen_ids.add(mid)
                all_candidate_ids.append((mid, lcode))
                
    print(f"\nTotal unique candidate movies across all languages: {len(all_candidate_ids)}")
    
    # 2. Fetch details using ThreadPoolExecutor (max 6 workers)
    to_fetch = []
    final_movies_map = {}
    
    for mid, lcode in all_candidate_ids:
        mid_str = str(mid)
        if mid_str in cache:
            item = cache[mid_str]
            if item:
                # Update language code/name if needed
                item["language"] = lcode
                item["language_name"] = LANG_CONFIG.get(lcode, {}).get("name", lcode)
                final_movies_map[mid] = item
        else:
            to_fetch.append((mid, lcode))
            
    print(f"Movies already cached: {len(final_movies_map)}. Movies to fetch: {len(to_fetch)}.")
    
    if to_fetch:
        print("Fetching movie details with ThreadPoolExecutor (6 workers)...")
        completed_count = 0
        cache_update_count = 0
        with ThreadPoolExecutor(max_workers=6) as executor:
            future_to_movie = {
                executor.submit(fetch_movie_detail, mid, lcode, cache): (mid, lcode)
                for mid, lcode in to_fetch
            }
            for future in as_completed(future_to_movie):
                mid, lcode = future_to_movie[future]
                completed_count += 1
                try:
                    result = future.result()
                    if result:
                        cache[str(mid)] = result
                        final_movies_map[mid] = result
                        cache_update_count += 1
                except Exception as err:
                    # Never crash on failure
                    pass
                    
                if completed_count % 100 == 0 or completed_count == len(to_fetch):
                    print(f"  Progress: {completed_count}/{len(to_fetch)} processed...")
                    # Periodically save cache to disk
                    try:
                        with open(CACHE_FILE, "w", encoding="utf-8") as f:
                            json.dump(cache, f, ensure_ascii=False)
                    except Exception:
                        pass

    # Save final tmdb_cache.json
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
        print(f"Updated cache file with {len(cache)} entries.")
    except Exception as e:
        print(f"Error saving cache: {e}")

    # Build final list of movies
    movies_list = list(final_movies_map.values())
    
    # Sort by popularity descending
    movies_list.sort(key=lambda m: m.get("popularity", 0.0), reverse=True)
    
    # Save backend/data/movies.json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(movies_list, f, ensure_ascii=False, indent=2)
        
    file_size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)
    
    # Per-language movie counts
    counts_by_lang = {}
    for m in movies_list:
        l = m.get("language", "unknown")
        counts_by_lang[l] = counts_by_lang.get(l, 0) + 1
        
    print("\n================ DATASET BUILD SUMMARY ================")
    print(f"Total movies saved: {len(movies_list)}")
    print(f"movies.json file size: {file_size_mb:.2f} MB")
    print("Movie count per language:")
    for l_code, cfg in LANG_CONFIG.items():
        cnt = counts_by_lang.get(l_code, 0)
        print(f"  {l_code} ({cfg['name']}): {cnt} movies")
    print("=======================================================\n")


if __name__ == "__main__":
    main()
