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
VIDEOS_CACHE_FILE = os.path.join(DATA_DIR, "videos_cache.json")
OUTPUT_FILE = os.path.join(DATA_DIR, "movies.json")

# Load environment variables
load_dotenv(os.path.join(BACKEND_DIR, ".env"))
TMDB_API_KEY = os.getenv("TMDB_API_KEY")

if not TMDB_API_KEY or TMDB_API_KEY == "your_key_here":
    print("ERROR: TMDB_API_KEY not configured in backend/.env", file=sys.stderr)
    sys.exit(1)

BASE_URL = "https://api.themoviedb.org/3"

# Final 7 languages
LANG_CONFIG = {
    "en": {"name": "Hollywood", "min_vote": 50, "pages": 30},
    "hi": {"name": "Bollywood/Hindi", "min_vote": 50, "pages": 40},
    "ta": {"name": "Tamil", "min_vote": 10, "pages": 25},
    "te": {"name": "Telugu", "min_vote": 10, "pages": 25},
    "ml": {"name": "Malayalam", "min_vote": 10, "pages": 25},
    "kn": {"name": "Kannada", "min_vote": 5, "pages": 15},
    "gu": {"name": "Gujarati", "min_vote": 0},
}

VIDEO_LANG_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
    "kn": "Kannada",
    "gu": "Gujarati",
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
        time.sleep(0.03)

    print(f"  Found {len(movie_ids)} IDs for {lang_code}.")
    return movie_ids


def fetch_hindi_ids():
    print("Discovering Bollywood/Hindi (hi) movies (target 1,200+ unique)...")
    hindi_ids = set()

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

    if len(hindi_ids) < 1200:
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
            if len(hindi_ids) >= 1260:
                break
            if page >= data.get("total_pages", 1):
                break
            time.sleep(0.02)

    print(f"  Total unique Hindi (hi) IDs collected: {len(hindi_ids)}.")
    return [(mid, "hi") for mid in hindi_ids]


def fetch_gujarati_ids():
    print("Discovering Gujarati (gu) movies exhaustively...")
    gu_ids = set()
    current_year = datetime.now().year

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

    for seed in GUJARATI_SEEDS:
        params = {
            "api_key": TMDB_API_KEY,
            "query": seed,
        }
        data = request_with_retry(f"{BASE_URL}/search/movie", params=params)
        if data:
            for item in data.get("results", []):
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
        
    director = None
    for crew_member in credits.get("crew", []):
        if crew_member.get("job") == "Director":
            director = crew_member.get("name")
            break
            
    kw_raw = data.get("keywords") or {}
    kw_items = kw_raw.get("keywords") if isinstance(kw_raw.get("keywords"), list) else kw_raw.get("results", [])
    keywords = [k.get("name") for k in (kw_items or []) if isinstance(k, dict) and k.get("name")]
    
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
    }


def fetch_movie_detail(mid, lang_code, cache):
    mid_str = str(mid)
    if mid_str in cache:
        return cache[mid_str]
        
    params = {
        "api_key": TMDB_API_KEY,
        "append_to_response": "credits,keywords"
    }
    url = f"{BASE_URL}/movie/{mid}"
    raw_json = request_with_retry(url, params=params, timeout=5)
    parsed = parse_movie_details(raw_json, lang_code)
    return parsed


def fetch_movie_videos(mid, videos_cache):
    mid_str = str(mid)
    if mid_str in videos_cache:
        return videos_cache[mid_str]

    params = {
        "api_key": TMDB_API_KEY,
        "include_video_language": "en,hi,ta,te,ml,kn,gu,null"
    }
    url = f"{BASE_URL}/movie/{mid}/videos"
    raw_json = request_with_retry(url, params=params, timeout=5)
    results = raw_json.get("results", []) if raw_json else []
    return results


def process_movie_trailers(movie, video_results):
    orig_lang = movie.get("language", "en")
    
    # Filter YouTube videos of type Trailer or Teaser
    candidates = [
        v for v in video_results
        if v.get("site") == "YouTube" and v.get("key") and v.get("type") in ("Trailer", "Teaser")
    ]
    
    # Group by language (iso_639_1; treat null or empty as "en")
    grouped = {}
    for v in candidates:
        lang = (v.get("iso_639_1") or "").strip().lower()
        if not lang:
            lang = "en"
        if lang not in grouped:
            grouped[lang] = []
        grouped[lang].append(v)
        
    # For each language keep the best video:
    # 1. Type == Trailer preferred over Teaser
    # 2. Official == True preferred
    # 3. Newest published_at
    def video_rank(v):
        is_trailer = 1 if v.get("type") == "Trailer" else 0
        is_official = 1 if v.get("official") is True else 0
        pub = v.get("published_at") or ""
        return (is_trailer, is_official, pub)

    trailers_list = []
    for lang, vids in grouped.items():
        vids.sort(key=video_rank, reverse=True)
        best = vids[0]
        lang_name = VIDEO_LANG_NAMES.get(lang, lang.upper())
        is_original = (lang == orig_lang)
        trailers_list.append({
            "lang": lang,
            "lang_name": lang_name,
            "key": best["key"],
            "is_original": is_original,
            "name": best.get("name", "")
        })

    # Sort order:
    # 1. original language first
    # 2. English (en) second (if not original)
    # 3. remaining languages
    def trailer_sort_order(t):
        if t.get("is_original"):
            return (0, "")
        if t.get("lang") == "en":
            return (1, "")
        return (2, t.get("lang_name", ""))

    trailers_list.sort(key=trailer_sort_order)

    # Determine default_trailer_key:
    # original, else English, else first, else null
    default_key = None
    if trailers_list:
        orig_t = next((t for t in trailers_list if t.get("is_original")), None)
        en_t = next((t for t in trailers_list if t.get("lang") == "en"), None)
        if orig_t:
            default_key = orig_t["key"]
        elif en_t:
            default_key = en_t["key"]
        else:
            default_key = trailers_list[0]["key"]

    orig_lang_name = LANG_CONFIG.get(orig_lang, {}).get("name", orig_lang)

    return trailers_list, default_key, orig_lang_name


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # 1. Load details cache
    cache = {}
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                cache = json.load(f)
            print(f"Loaded {len(cache)} cached movies from {CACHE_FILE}")
        except Exception as e:
            print(f"Could not load cache: {e}")
            cache = {}

    # 2. Load videos cache
    videos_cache = {}
    if os.path.exists(VIDEOS_CACHE_FILE):
        try:
            with open(VIDEOS_CACHE_FILE, "r", encoding="utf-8") as f:
                videos_cache = json.load(f)
            print(f"Loaded {len(videos_cache)} cached video results from {VIDEOS_CACHE_FILE}")
        except Exception as e:
            print(f"Could not load videos cache: {e}")
            videos_cache = {}

    # Purge any unconfigured languages
    for k in list(cache.keys()):
        if cache[k] and cache[k].get("language") not in LANG_CONFIG:
            del cache[k]

    # Discover candidate IDs
    all_candidate_ids = []
    seen_ids = set()

    for mid, lcode in fetch_hindi_ids():
        if mid not in seen_ids:
            seen_ids.add(mid)
            all_candidate_ids.append((mid, lcode))

    for mid, lcode in fetch_gujarati_ids():
        if mid not in seen_ids:
            seen_ids.add(mid)
            all_candidate_ids.append((mid, lcode))

    for lcode in ["en", "ta", "te", "ml", "kn"]:
        cfg = LANG_CONFIG[lcode]
        for mid, l in fetch_standard_language_ids(lcode, cfg):
            if mid not in seen_ids:
                seen_ids.add(mid)
                all_candidate_ids.append((mid, l))

    print(f"\nTotal candidate movies across 7 target languages: {len(all_candidate_ids)}")

    # Ensure details are fetched
    to_fetch_details = []
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
            to_fetch_details.append((mid, lcode))

    if to_fetch_details:
        print(f"Fetching details for {len(to_fetch_details)} remaining movies...")
        completed = 0
        with ThreadPoolExecutor(max_workers=6) as executor:
            future_to_movie = {
                executor.submit(fetch_movie_detail, mid, lcode, cache): (mid, lcode)
                for mid, lcode in to_fetch_details
            }
            for future in as_completed(future_to_movie):
                mid, lcode = future_to_movie[future]
                completed += 1
                try:
                    result = future.result()
                    if result:
                        cache[str(mid)] = result
                        final_movies_map[mid] = result
                except Exception:
                    pass

    # Save details cache
    try:
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving details cache: {e}")

    # Now fetch multi-language videos for all movies
    target_movies = [m for m in final_movies_map.values() if m and m.get("language") in LANG_CONFIG]
    print(f"\nProcessing multi-language trailers for {len(target_movies)} movies...")

    to_fetch_videos = [m["id"] for m in target_movies if str(m["id"]) not in videos_cache]
    print(f"Videos already cached: {len(target_movies) - len(to_fetch_videos)}. Videos to fetch: {len(to_fetch_videos)}.")

    if to_fetch_videos:
        print("Fetching multi-language videos with ThreadPoolExecutor (max 6 workers)...")
        completed = 0
        with ThreadPoolExecutor(max_workers=6) as executor:
            future_to_vid = {
                executor.submit(fetch_movie_videos, mid, videos_cache): mid
                for mid in to_fetch_videos
            }
            for future in as_completed(future_to_vid):
                mid = future_to_vid[future]
                completed += 1
                try:
                    vids = future.result()
                    videos_cache[str(mid)] = vids
                except Exception:
                    videos_cache[str(mid)] = []

                if completed % 200 == 0 or completed == len(to_fetch_videos):
                    print(f"  Videos progress: {completed}/{len(to_fetch_videos)}...")
                    try:
                        with open(VIDEOS_CACHE_FILE, "w", encoding="utf-8") as f:
                            json.dump(videos_cache, f, ensure_ascii=False)
                    except Exception:
                        pass

    # Save final videos cache
    try:
        with open(VIDEOS_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(videos_cache, f, ensure_ascii=False)
        print(f"Saved {len(videos_cache)} video cache entries to {VIDEOS_CACHE_FILE}.")
    except Exception as e:
        print(f"Error saving videos cache: {e}")

    # Process and attach trailers to each movie
    # Keep track of trailer counts per language group
    trailer_stats = {lang: {"0": 0, "1": 0, "2": 0, "3+": 0} for lang in LANG_CONFIG}

    for m in target_movies:
        mid_str = str(m["id"])
        raw_vids = videos_cache.get(mid_str, [])
        trailers, default_key, orig_lang_name = process_movie_trailers(m, raw_vids)
        
        m["trailers"] = trailers
        m["default_trailer_key"] = default_key
        m["trailer_key"] = default_key
        m["original_language_name"] = orig_lang_name

        m_lang = m.get("language", "unknown")
        n_trailers = len(trailers)
        if m_lang in trailer_stats:
            if n_trailers == 0:
                trailer_stats[m_lang]["0"] += 1
            elif n_trailers == 1:
                trailer_stats[m_lang]["1"] += 1
            elif n_trailers == 2:
                trailer_stats[m_lang]["2"] += 1
            else:
                trailer_stats[m_lang]["3+"] += 1

    # Sort movies by popularity descending
    target_movies.sort(key=lambda m: m.get("popularity", 0.0), reverse=True)

    # Save output to backend/data/movies.json
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(target_movies, f, ensure_ascii=False, indent=2)

    file_size_mb = os.path.getsize(OUTPUT_FILE) / (1024 * 1024)

    print("\n================ FINAL DATASET & TRAILER SUMMARY ================")
    print(f"Total movies saved: {len(target_movies)}")
    print(f"movies.json file size: {file_size_mb:.2f} MB")
    print("\nTrailer Language Breakdown per Language Group:")
    print("Language                 Total   0 Trailers   1 Trailer   2 Trailers   3+ Trailers")
    print("-" * 75)
    for l_code, cfg in LANG_CONFIG.items():
        st = trailer_stats[l_code]
        tot = sum(st.values())
        print(f"{cfg['name']:<24} {tot:<7} {st['0']:<12} {st['1']:<11} {st['2']:<12} {st['3+']:<11}")
    print("=================================================================\n")


if __name__ == "__main__":
    main()
