import os
import sys
import json
import time
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed
import requests
from dotenv import load_dotenv

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BACKEND_DIR, "data")
CACHE_FILE = os.path.join(DATA_DIR, "tmdb_cache.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "movies.json")

# Load environment variables
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

if not TMDB_API_KEY or TMDB_API_KEY == "your_key_here":
    print("ERROR: TMDB_API_KEY not configured in backend/.env", file=sys.stderr)
    sys.exit(1)

BASE_URL = "https://api.themoviedb.org/3"

# Final languages: en (Hollywood), hi (Bollywood/Hindi), gu (Gujarati),
# ta (Tamil), te (Telugu), ml (Malayalam), kn (Kannada).
# Removed completely: bn, mr, pa.
LANG_CONFIG = {
    "en": {"name": "Hollywood", "min_vote": 50, "pages": 30},
    "hi": {"name": "Bollywood/Hindi", "min_vote": 50, "pages": 40}, # Handled with dual sort
    "ta": {"name": "Tamil", "min_vote": 10, "pages": 25},
    "te": {"name": "Telugu", "min_vote": 10, "pages": 25},
    "ml": {"name": "Malayalam", "min_vote": 10, "pages": 25},
    "kn": {"name": "Kannada", "min_vote": 5, "pages": 15},
    "gu": {"name": "Gujarati", "min_vote": 0}, # Handled exhaustively
}

GUJARATI_SEEDS = [
    "Hellaro", "Chhello Show", "Wrong Side Raju", "Chal Jeevi Laiye", "Vash",
    "Kehvatlal Parivar", "Naadi Dosh", "Love Ni Bhavai", "3 Ekka", "Carry On Kesar",
    "Gujjubhai the Great", "Chhello Divas", "Bey Yaar", "Shubh Yatra", "Fakt Mahilao Maate"
]

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


def fetch_standard_language_ids(lang_code, config):
    movie_ids = []
    target_pages = config["pages"]
    min_vote = config["min_vote"]
    
    print(f"Discovering {config['name']} ({lang_code}) movies (up to {target_pages} pages, min votes {min_vote})...")
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
        if page >= data.get("total_pages", 1):
            break
        time.sleep(0.04)

    print(f"  Found {len(movie_ids)} IDs for {lang_code}.")
    return movie_ids


def fetch_hindi_ids():
    # MORE HINDI: for hi (vote_count.gte=50) run /discover/movie with
    # sort_by=popularity.desc for 40 pages AND sort_by=vote_count.desc for 40 pages,
    # then dedupe by id (target 1,200+ unique movies).
    print("Discovering Bollywood/Hindi (hi) movies (target 1,200+ unique)...")
    hindi_ids = set()

    # Pass 1: popularity.desc (40 pages, vote_count.gte=50)
    for page in range(1, 41):
        params = {
            "api_key": TMDB_API_KEY,
            "with_original_language": "hi",
            "sort_by": "popularity.desc",
            "vote_count.gte": 50,
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
                hindi_ids.add(mid)
        if page >= data.get("total_pages", 1):
            break
        time.sleep(0.03)

    print(f"  Hindi vote_count.gte=50 popularity pass: {len(hindi_ids)} unique IDs.")

    # Pass 2: vote_count.desc (40 pages, vote_count.gte=50)
    for page in range(1, 41):
        params = {
            "api_key": TMDB_API_KEY,
            "with_original_language": "hi",
            "sort_by": "vote_count.desc",
            "vote_count.gte": 50,
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
                hindi_ids.add(mid)
        if page >= data.get("total_pages", 1):
            break
        time.sleep(0.03)

    print(f"  Hindi vote_count.gte=50 vote_count pass: {len(hindi_ids)} unique IDs.")

    # Target 1,200+ unique movies: If TMDB has fewer than 1,200 movies with vote_count.gte=50,
    # supplement with vote_count.gte=15 to reach the 1,200+ target.
    if len(hindi_ids) < 1200:
        print(f"  Supplementing to reach target 1,200+ unique Hindi movies (currently {len(hindi_ids)})...")
        for page in range(1, 75):
            params = {
                "api_key": TMDB_API_KEY,
                "with_original_language": "hi",
                "sort_by": "popularity.desc",
                "vote_count.gte": 15,
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
                    hindi_ids.add(mid)
            if len(hindi_ids) >= 1250:
                break
            if page >= data.get("total_pages", 1):
                break
            time.sleep(0.02)

    print(f"  Total unique Hindi (hi) IDs collected: {len(hindi_ids)}.")
    return [(mid, "hi") for mid in hindi_ids]


def fetch_gujarati_ids():
    # MORE GUJARATI:
    # 1. /discover/movie with with_original_language=gu, vote_count.gte=0, using ALL sort orders
    #    and every available page: popularity.desc, vote_count.desc, vote_average.desc,
    #    primary_release_date.desc, revenue.desc.
    # 2. Once per primary_release_year from 1960 to current year.
    # 3. with_origin_country=IN together with with_original_language=gu.
    # 4. Seed titles search.
    print("Discovering Gujarati (gu) movies exhaustively...")
    gu_ids = set()
    current_year = datetime.now().year

    # 1. All sort orders across all pages
    sort_orders = [
        "popularity.desc", "vote_count.desc", "vote_average.desc",
        "primary_release_date.desc", "revenue.desc"
    ]
    for sort_order in sort_orders:
        for page in range(1, 51):
            params = {
                "api_key": TMDB_API_KEY,
                "with_original_language": "gu",
                "vote_count.gte": 0,
                "sort_by": sort_order,
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
                    gu_ids.add(mid)
            if page >= data.get("total_pages", 1):
                break
            time.sleep(0.03)

    print(f"  Gujarati after sort orders: {len(gu_ids)} IDs.")

    # 2. Yearly scan from 1960 to current_year
    for year in range(1960, current_year + 1):
        params = {
            "api_key": TMDB_API_KEY,
            "with_original_language": "gu",
            "vote_count.gte": 0,
            "primary_release_year": year,
            "page": 1,
        }
        data = request_with_retry(f"{BASE_URL}/discover/movie", params=params)
        if not data:
            continue
        for item in data.get("results", []):
            mid = item.get("id")
            if mid:
                gu_ids.add(mid)
        # If there are multiple pages for that year
        total_p = data.get("total_pages", 1)
        for p in range(2, min(total_p + 1, 5)):
            params["page"] = p
            d2 = request_with_retry(f"{BASE_URL}/discover/movie", params=params)
            if d2:
                for item in d2.get("results", []):
                    mid = item.get("id")
                    if mid:
                        gu_ids.add(mid)
        time.sleep(0.02)

    print(f"  Gujarati after yearly scan (1960-{current_year}): {len(gu_ids)} IDs.")

    # 3. with_origin_country=IN together with with_original_language=gu
    for page in range(1, 51):
        params = {
            "api_key": TMDB_API_KEY,
            "with_original_language": "gu",
            "with_origin_country": "IN",
            "vote_count.gte": 0,
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
                gu_ids.add(mid)
        if page >= data.get("total_pages", 1):
            break
        time.sleep(0.03)

    print(f"  Gujarati after origin country IN scan: {len(gu_ids)} IDs.")

    # 4. Seed titles
    for seed in GUJARATI_SEEDS:
        params = {
            "api_key": TMDB_API_KEY,
            "query": seed,
        }
        data = request_with_retry(f"{BASE_URL}/search/movie", params=params)
        if data:
            for item in data.get("results", []):
                # Keep a result ONLY if original_language == "gu"
                if item.get("original_language") == "gu":
                    mid = item.get("id")
                    if mid:
                        gu_ids.add(mid)
        time.sleep(0.03)

    print(f"  Total unique Gujarati (gu) IDs collected: {len(gu_ids)}.")
    return [(mid, "gu") for mid in gu_ids]


def parse_movie_details(data, lang_code):
    if not data:
        return None
        
    overview = (data.get("overview") or "").strip()
    poster_path = data.get("poster_path")
    poster_url = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
    
    # Requirement: For gu: keep if title and (poster OR overview).
    # For others: skip if no overview AND no poster.
    title = (data.get("title") or data.get("original_title") or "").strip()
    if not title:
        return None
        
    if not overview and not poster_url:
        return None
        
    mid = data.get("id")
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
        "overview": overview[:500],
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
            
    # Remove any bn, mr, pa from cache or output
    disallowed_langs = {"bn", "mr", "pa"}
    for k in list(cache.keys()):
        if cache[k] and cache[k].get("language") in disallowed_langs:
            del cache[k]

    # Collect candidate IDs
    all_candidate_ids = []
    seen_ids = set()

    # 1. Hindi (dual-sort)
    for mid, lcode in fetch_hindi_ids():
        if mid not in seen_ids:
            seen_ids.add(mid)
            all_candidate_ids.append((mid, lcode))

    # 2. Gujarati (exhaustive)
    for mid, lcode in fetch_gujarati_ids():
        if mid not in seen_ids:
            seen_ids.add(mid)
            all_candidate_ids.append((mid, lcode))

    # 3. Standard languages: en, ta, te, ml, kn
    for lcode in ["en", "ta", "te", "ml", "kn"]:
        cfg = LANG_CONFIG[lcode]
        for mid, l in fetch_standard_language_ids(lcode, cfg):
            if mid not in seen_ids:
                seen_ids.add(mid)
                all_candidate_ids.append((mid, l))

    print(f"\nTotal unique candidates across all 7 target languages: {len(all_candidate_ids)}")

    # Details fetch with ThreadPoolExecutor (max 6 workers)
    to_fetch = []
    final_movies_map = {}

    for mid, lcode in all_candidate_ids:
        mid_str = str(mid)
        if mid_str in cache:
            item = cache[mid_str]
            if item:
                item["language"] = lcode
                item["language_name"] = LANG_CONFIG.get(lcode, {}).get("name", lcode)
                final_movies_map[mid] = item
        else:
            to_fetch.append((mid, lcode))

    print(f"Movies already cached: {len(final_movies_map)}. Movies to fetch: {len(to_fetch)}.")

    if to_fetch:
        print("Fetching remaining movie details with ThreadPoolExecutor (6 workers)...")
        completed_count = 0
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
                except Exception:
                    pass

                if completed_count % 100 == 0 or completed_count == len(to_fetch):
                    print(f"  Progress: {completed_count}/{len(to_fetch)} processed...")
                    try:
                        with open(CACHE_FILE, "w", encoding="utf-8") as f:
                            json.dump(cache, f, ensure_ascii=False)
                    except Exception:
                        pass

    # Save final cache
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
        print(f"Updated cache file with {len(cache)} entries.")
    except Exception as e:
        print(f"Error saving cache: {e}")

    # Build final list of movies, strictly filtering out any bn, mr, pa
    movies_list = [
        m for m in final_movies_map.values()
        if m and m.get("language") in LANG_CONFIG
    ]

    # Sort by popularity descending
    movies_list.sort(key=lambda m: m.get("popularity", 0.0), reverse=True)

    # Save to backend/data/movies.json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(movies_list, f, ensure_ascii=False, indent=2)

    file_size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)

    # Movie counts by language
    counts_by_lang = {}
    for m in movies_list:
        l = m.get("language", "unknown")
        counts_by_lang[l] = counts_by_lang.get(l, 0) + 1

    print("\n================ FINAL DATASET BUILD SUMMARY ================")
    print(f"Total movies saved: {len(movies_list)}")
    print(f"movies.json file size: {file_size_mb:.2f} MB")
    print("Movie count per language:")
    for l_code, cfg in LANG_CONFIG.items():
        cnt = counts_by_lang.get(l_code, 0)
        print(f"  {l_code} ({cfg['name']}): {cnt} movies")
    print("============================================================\n")


if __name__ == "__main__":
    main()
