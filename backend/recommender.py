import os
import json
import unicodedata
import difflib
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

ALLOWED_LANGUAGES = {
    "en": "Hollywood",
    "hi": "Bollywood/Hindi",
    "gu": "Gujarati",
    "ta": "Tamil",
    "te": "Telugu",
    "ml": "Malayalam",
    "kn": "Kannada"
}

MOOD_DEFINITIONS = {
    "Feel-good": {
        "label": "Feel-good",
        "any": {"Comedy", "Family", "Animation"},
        "exclude": {"Horror", "War", "Crime"},
        "boost": set()
    },
    "Thrilling": {
        "label": "Thrilling",
        "any": {"Thriller", "Action", "Crime", "Mystery"},
        "exclude": {"Family", "Animation"},
        "boost": set()
    },
    "Romantic": {
        "label": "Romantic",
        "any": {"Romance"},
        "exclude": set(),
        "boost": {"Drama", "Comedy"}
    },
    "Scary": {
        "label": "Scary",
        "any": {"Horror"},
        "exclude": set(),
        "boost": {"Thriller", "Mystery"}
    },
    "Family night": {
        "label": "Family night",
        "any": {"Family", "Animation"},
        "exclude": {"Horror"},
        "boost": {"Adventure", "Comedy"}
    },
    "Mind-bending": {
        "label": "Mind-bending",
        "any": {"Science Fiction", "Mystery"},
        "exclude": set(),
        "boost": {"Thriller"}
    },
    "Emotional": {
        "label": "Emotional",
        "any": {"Drama"},
        "exclude": {"Horror", "Action"},
        "boost": {"Romance"}
    }
}


def normalize_text(text):
    if not text:
        return "", ""
    # Unicode NFKD & strip combining accents (e.g. Bahubali = Bāhubali)
    nfkd = unicodedata.normalize('NFKD', text)
    stripped = ''.join(c for c in nfkd if not unicodedata.combining(c))
    cf = stripped.casefold()
    cf = cf.replace('&', ' and ')
    # Turn every character that is not a letter or digit into a space
    cleaned = ''.join(c if c.isalnum() else ' ' for c in cf)
    spaced = ' '.join(cleaned.split())
    compact = spaced.replace(' ', '')
    return spaced, compact


class MovieRecommender:
    def __init__(self, data_path=None):
        if data_path is None:
            backend_dir = os.path.dirname(os.path.abspath(__file__))
            data_path = os.path.join(backend_dir, "data", "movies.json")
        self.data_path = data_path
        self.movies = []
        self.movie_map = {}
        self.id_to_idx = {}
        self.tfidf_matrix = None
        self.vectorizer = None
        self.quality_scores = None
        self.language_counts = {}
        self.search_index = []
        self.mood_masks = {}
        self.mood_scores = {}
        self.load_and_fit()

    def load_and_fit(self):
        if not os.path.exists(self.data_path):
            print(f"Warning: {self.data_path} not found. Recommender initialized with 0 movies.")
            return

        with open(self.data_path, "r", encoding="utf-8") as f:
            raw_movies = json.load(f)

        if not raw_movies:
            return

        # Filter strictly to allowed languages
        self.movies = [
            m for m in raw_movies
            if m and m.get("language") in ALLOWED_LANGUAGES
        ]

        print(f"Loaded {len(self.movies)} movies into Recommender.")

        self.movie_map = {}
        self.id_to_idx = {}
        self.language_counts = {}
        corpus = []

        vote_counts = []
        vote_averages = []
        popularities = []

        for idx, m in enumerate(self.movies):
            mid = m["id"]
            self.movie_map[mid] = m
            self.id_to_idx[mid] = idx

            lang = m.get("language", "unknown")
            self.language_counts[lang] = self.language_counts.get(lang, 0) + 1

            # Feature text representation:
            # - genres weighted x3
            # - keywords weighted x2
            # - director
            # - top cast
            # - overview text
            genres = m.get("genres", [])
            genres_text = (" ".join([g.replace(" ", "_") for g in genres]) + " ") * 3

            keywords = m.get("keywords", [])
            keywords_text = (" ".join([k.replace(" ", "_") for k in keywords]) + " ") * 2

            director = m.get("director") or ""
            director_text = (director.replace(" ", "_") + " ") if director else ""

            cast = m.get("cast", [])
            cast_names = [c.get("name", "").replace(" ", "_") for c in cast[:4] if c.get("name")]
            cast_text = " ".join(cast_names) + " "

            overview = m.get("overview") or ""

            doc = f"{genres_text} {keywords_text} {director_text} {cast_text} {overview}".lower()
            corpus.append(doc)

            vote_counts.append(float(m.get("vote_count", 0)))
            vote_averages.append(float(m.get("vote_average", 0.0)))
            popularities.append(float(m.get("popularity", 0.0)))

        # Fit TF-IDF sparse matrix (float32, low memory, max 12000 features)
        self.vectorizer = TfidfVectorizer(
            max_features=12000,
            stop_words="english",
            dtype=np.float32,
            ngram_range=(1, 2),
            sublinear_tf=True
        )
        self.tfidf_matrix = self.vectorizer.fit_transform(corpus)

        # Quality score: Bayesian weighted rating + log-scaled popularity
        v_arr = np.array(vote_counts, dtype=np.float32)
        r_arr = np.array(vote_averages, dtype=np.float32)
        pop_arr = np.array(popularities, dtype=np.float32)

        # Mean vote average
        valid_votes = v_arr > 0
        c_mean = float(np.mean(r_arr[valid_votes])) if np.any(valid_votes) else 6.0
        m_val = float(np.percentile(v_arr[v_arr > 0], 35)) if np.any(v_arr > 0) else 5.0
        m_val = max(m_val, 5.0)

        # Bayesian rating: (v / (v + m)) * R + (m / (v + m)) * C
        wr = (v_arr / (v_arr + m_val)) * r_arr + (m_val / (v_arr + m_val)) * c_mean
        wr_min, wr_max = np.min(wr), np.max(wr)
        wr_norm = (wr - wr_min) / (wr_max - wr_min + 1e-6)

        # Log popularity
        pop_log = np.log1p(np.maximum(pop_arr, 0.0))
        pop_min, pop_max = np.min(pop_log), np.max(pop_log)
        pop_norm = (pop_log - pop_min) / (pop_max - pop_min + 1e-6)

        # Combined quality score in 0..1
        raw_quality = 0.65 * wr_norm + 0.35 * pop_norm
        q_min, q_max = np.min(raw_quality), np.max(raw_quality)
        self.quality_scores = (raw_quality - q_min) / (q_max - q_min + 1e-6)

        # Build search index once at startup
        self.search_index = []
        for idx, m in enumerate(self.movies):
            variants = []
            titles = [m.get("title", ""), m.get("original_title", "")]
            # Alias for Last Film Show (Chhello Show)
            if m.get("id") == 821494:
                titles.append("Chhello Show")

            seen_compact = set()
            for t in titles:
                if not t:
                    continue
                s, c = normalize_text(t)
                if c and c not in seen_compact:
                    seen_compact.add(c)
                    variants.append((s, c, s.split()))
                if s.startswith("the "):
                    no_the_s = s[4:].strip()
                    no_the_c = no_the_s.replace(' ', '')
                    if no_the_c and no_the_c not in seen_compact:
                        seen_compact.add(no_the_c)
                        variants.append((no_the_s, no_the_c, no_the_s.split()))

            self.search_index.append({
                "idx": idx,
                "movie": m,
                "variants": variants,
                "quality": float(self.quality_scores[idx]),
                "popularity": float(m.get("popularity", 0.0))
            })

        # Precompute mood boolean masks and boost scores
        self.mood_masks = {}
        self.mood_scores = {}
        for mood_key, mdef in MOOD_DEFINITIONS.items():
            mask = np.zeros(len(self.movies), dtype=bool)
            scores = np.zeros(len(self.movies), dtype=np.int32)
            any_set = mdef["any"]
            exclude_set = mdef["exclude"]
            boost_set = mdef["boost"]
            for idx, m in enumerate(self.movies):
                gset = set(m.get("genres", []))
                matched_any = len(gset & any_set)
                has_exclude = bool(gset & exclude_set)
                if matched_any > 0 and not has_exclude:
                    mask[idx] = True
                    scores[idx] = matched_any + len(gset & boost_set)
            self.mood_masks[mood_key] = mask
            self.mood_scores[mood_key] = scores

        print("Recommender TF-IDF, Quality matrix, Search index, and Mood masks fitted successfully.")

    def get_movie(self, movie_id):
        try:
            mid = int(movie_id)
        except (ValueError, TypeError):
            return None
        return self.movie_map.get(mid)

    def format_card(self, movie, match_percent=None):
        if not movie:
            return None
        default_key = movie.get("default_trailer_key") or movie.get("trailer_key")
        return {
            "id": movie["id"],
            "title": movie.get("title", ""),
            "original_title": movie.get("original_title", ""),
            "year": movie.get("year"),
            "language": movie.get("language", ""),
            "language_name": movie.get("language_name", ""),
            "genres": movie.get("genres", []),
            "poster_url": movie.get("poster_url"),
            "backdrop_url": movie.get("backdrop_url"),
            "overview": movie.get("overview", ""),
            "tagline": movie.get("tagline", ""),
            "runtime": movie.get("runtime"),
            "tmdb_rating": movie.get("vote_average", 0.0),
            "vote_count": movie.get("vote_count", 0),
            "default_trailer_key": default_key,
            "trailer_key": default_key,
            "match_percent": match_percent
        }

    def get_languages(self):
        order = ["en", "hi", "gu", "ta", "te", "ml", "kn"]
        result = []
        for code in order:
            name = ALLOWED_LANGUAGES.get(code, code)
            count = self.language_counts.get(code, 0)
            result.append({"code": code, "name": name, "count": count})
        return result

    def search(self, query="", limit=10):
        # Global search: ignores languages and genre parameters
        if not query or not self.movies:
            return []

        q_spaced, q_compact = normalize_text(query)
        if len(q_compact) < 2:
            return []

        q_tokens = q_spaced.split()
        matched_tier = {}

        for item in self.search_index:
            idx = item["idx"]
            best_tier = 99
            for s, c, tokens in item["variants"]:
                # Tier 1: exact compact match
                if c == q_compact:
                    best_tier = 1
                    break
                # Tier 2: title starts with compact query
                if c.startswith(q_compact):
                    best_tier = min(best_tier, 2)
                # Tier 3: every query token is a prefix of some title token
                elif q_tokens and len(q_tokens) > 1 and all(any(t.startswith(q) for t in tokens) for q in q_tokens):
                    best_tier = min(best_tier, 3)
                # Tier 4: query compact substring of title compact
                elif q_compact in c:
                    best_tier = min(best_tier, 4)

            if best_tier <= 4:
                matched_tier[idx] = best_tier

        # Tier 5: fuzzy fallback only when fewer than 8 results exist
        if len(matched_tier) < 8 and len(q_compact) >= 3:
            q_len = len(q_compact)
            first_char = q_compact[0]
            for item in self.search_index:
                idx = item["idx"]
                if idx in matched_tier:
                    continue
                for s, c, tokens in item["variants"]:
                    if not c or c[0] != first_char:
                        continue
                    if abs(len(c) - q_len) <= 3:
                        if difflib.SequenceMatcher(None, q_compact, c).ratio() >= 0.8:
                            matched_tier[idx] = 5
                            break
                    elif len(c) > q_len:
                        prefix_c = c[:q_len]
                        if difflib.SequenceMatcher(None, q_compact, prefix_c).ratio() >= 0.8:
                            matched_tier[idx] = 5
                            break

        matched_items = [
            (matched_tier[item["idx"]], -item["quality"], -item["popularity"], item["movie"])
            for item in self.search_index if item["idx"] in matched_tier
        ]
        matched_items.sort(key=lambda x: (x[0], x[1], x[2]))

        return [self.format_card(m) for _, _, _, m in matched_items[:limit]]

    def get_popular(self, languages=None, n=12):
        if not self.movies or self.quality_scores is None:
            return []

        lang_set = set([l.strip().lower() for l in languages if l.strip()]) if languages else None

        candidates = []
        for idx, m in enumerate(self.movies):
            if lang_set and m.get("language", "").lower() not in lang_set:
                continue
            q_score = float(self.quality_scores[idx])
            candidates.append((idx, m, q_score))

        # Ordered strictly by quality score descending
        candidates.sort(key=lambda x: x[2], reverse=True)
        return [self.format_card(m) for _, m, _ in candidates[:n]]

    def recommend(self, movie_id, languages=None, n=12, alpha=0.7):
        if not self.movies or self.tfidf_matrix is None:
            return {"results": [], "same_language": [], "other_languages": []}

        try:
            mid = int(movie_id)
        except (ValueError, TypeError):
            return {"results": [], "same_language": [], "other_languages": []}

        if mid not in self.id_to_idx:
            fallback = self.get_popular(languages=languages, n=n)
            return {"results": fallback, "same_language": fallback, "other_languages": []}

        target_idx = self.id_to_idx[mid]
        target_movie = self.movies[target_idx]
        target_lang = target_movie.get("language", "")

        target_vec = self.tfidf_matrix[target_idx]
        sims = self.tfidf_matrix.dot(target_vec.T).toarray().ravel()

        candidate_indices = []
        candidate_content = []
        candidate_quality = []

        for idx in range(len(self.movies)):
            if idx == target_idx:
                continue
            candidate_indices.append(idx)
            candidate_content.append(sims[idx])
            candidate_quality.append(self.quality_scores[idx])

        if not candidate_indices:
            return {"results": [], "same_language": [], "other_languages": []}

        c_arr = np.array(candidate_content, dtype=np.float32)
        q_arr = np.array(candidate_quality, dtype=np.float32)

        # Min-max normalize content scores
        c_min, c_max = np.min(c_arr), np.max(c_arr)
        if c_max > c_min:
            c_norm = (c_arr - c_min) / (c_max - c_min + 1e-6)
        else:
            c_norm = np.zeros_like(c_arr)

        # Min-max normalize quality scores
        q_min, q_max = np.min(q_arr), np.max(q_arr)
        if q_max > q_min:
            q_norm = (q_arr - q_min) / (q_max - q_min + 1e-6)
        else:
            q_norm = q_arr

        # Fixed blend: 0.7 * content + 0.3 * quality
        hybrid = 0.7 * c_norm + 0.3 * q_norm

        # Normalize final score to match percentage (65% to 99%)
        h_min, h_max = np.min(hybrid), np.max(hybrid)
        if h_max > h_min:
            scaled = (hybrid - h_min) / (h_max - h_min + 1e-6)
            match_percentages = 65 + (scaled * 34)
        else:
            match_percentages = np.full_like(hybrid, 80.0)

        sorted_order = np.argsort(-hybrid)

        same_language = []
        other_languages = []
        combined_results = []

        lang_set = set([l.strip().lower() for l in languages if l.strip()]) if languages else None

        for i in sorted_order:
            idx = candidate_indices[i]
            m = self.movies[idx]
            match_pct = int(round(match_percentages[i]))
            card = self.format_card(m, match_percent=match_pct)
            m_lang = m.get("language", "")

            # same_language: top n movies whose original language equals the picked movie's
            if m_lang == target_lang:
                if len(same_language) < n:
                    same_language.append(card)
            else:
                # other_languages: top n movies of all OTHER languages
                if len(other_languages) < n:
                    other_languages.append(card)

            # combined_results: preserves backward compatibility with existing tests
            if lang_set is None or m_lang.lower() in lang_set:
                if len(combined_results) < n:
                    combined_results.append(card)

            if len(same_language) >= n and len(other_languages) >= n and len(combined_results) >= n:
                break

        return {
            "results": combined_results,
            "same_language": same_language,
            "other_languages": other_languages
        }

    def get_genres(self, languages=None):
        if not self.movies:
            return []

        lang_set = set([l.strip().lower() for l in languages if l.strip()]) if languages else None
        genre_counts = {}
        for m in self.movies:
            if lang_set and m.get("language", "").lower() not in lang_set:
                continue
            for g in m.get("genres", []):
                genre_counts[g] = genre_counts.get(g, 0) + 1

        popular_order = [
            "Action", "Comedy", "Drama", "Horror", "Romance",
            "Thriller", "Science Fiction", "Crime"
        ]
        sorted_genres = []
        for p in popular_order:
            if p in genre_counts and genre_counts[p] > 0:
                sorted_genres.append({"name": p, "count": genre_counts[p]})

        rest = [g for g in genre_counts if g not in popular_order and genre_counts[g] > 0]
        rest.sort()
        for r in rest:
            sorted_genres.append({"name": r, "count": genre_counts[r]})

        return sorted_genres

    def get_cards(self, ids):
        if not ids or not isinstance(ids, list):
            return []
        cards = []
        for x in ids[:100]:
            try:
                mid = int(x)
            except (ValueError, TypeError):
                continue
            m = self.movie_map.get(mid)
            if m:
                cards.append(self.format_card(m))
        return cards

    def picked_for_you(self, ids, languages=None, n=12):
        if not self.movies or self.tfidf_matrix is None:
            return []

        if not ids or not isinstance(ids, list):
            return self.get_popular(languages=languages, n=n)

        valid_ids = []
        for x in ids:
            try:
                mid = int(x)
                valid_ids.append(mid)
            except (ValueError, TypeError):
                continue

        existing_ids = [mid for mid in valid_ids if mid in self.id_to_idx]
        if not existing_ids:
            pop_cards = self.get_popular(languages=languages, n=n)
            for card in pop_cards:
                card["because_title"] = None
            return pop_cards

        # Top 10 most recent favourites
        top_favs = existing_ids[:10]
        k_count = len(top_favs)
        fav_indices = [self.id_to_idx[mid] for mid in top_favs]
        weights = [k_count - k for k in range(k_count)]
        sum_w = float(sum(weights))

        weighted_sim = np.zeros(len(self.movies), dtype=np.float32)
        max_sim = np.full(len(self.movies), -1.0, dtype=np.float32)
        best_fav_idx = np.full(len(self.movies), fav_indices[0], dtype=np.int32)

        for fav_idx, w in zip(fav_indices, weights):
            vec = self.tfidf_matrix[fav_idx]
            sim_k = self.tfidf_matrix.dot(vec.T).toarray().ravel()
            weighted_sim += float(w) * sim_k
            higher = sim_k > max_sim
            max_sim[higher] = sim_k[higher]
            best_fav_idx[higher] = fav_idx

        weighted_sim /= sum_w

        fav_id_set = set(valid_ids)
        lang_set = set([l.strip().lower() for l in languages if l.strip()]) if languages else None

        cand_indices = []
        cand_content = []
        cand_quality = []
        cand_best_fav = []

        for idx in range(len(self.movies)):
            m = self.movies[idx]
            if m["id"] in fav_id_set:
                continue
            if lang_set and m.get("language", "").lower() not in lang_set:
                continue
            cand_indices.append(idx)
            cand_content.append(weighted_sim[idx])
            cand_quality.append(self.quality_scores[idx])
            cand_best_fav.append(best_fav_idx[idx])

        if not cand_indices:
            return []

        c_arr = np.array(cand_content, dtype=np.float32)
        q_arr = np.array(cand_quality, dtype=np.float32)

        # Min-max normalize content
        c_min, c_max = np.min(c_arr), np.max(c_arr)
        if c_max > c_min:
            c_norm = (c_arr - c_min) / (c_max - c_min + 1e-6)
        else:
            c_norm = np.zeros_like(c_arr)

        # Min-max normalize quality
        q_min, q_max = np.min(q_arr), np.max(q_arr)
        if q_max > q_min:
            q_norm = (q_arr - q_min) / (q_max - q_min + 1e-6)
        else:
            q_norm = q_arr

        # Fixed blend: 0.7 * content + 0.3 * quality
        hybrid = 0.7 * c_norm + 0.3 * q_norm

        # Scale to match percentage (65% to 99%)
        h_min, h_max = np.min(hybrid), np.max(hybrid)
        if h_max > h_min:
            scaled = (hybrid - h_min) / (h_max - h_min + 1e-6)
            match_pcts = 65 + (scaled * 34)
        else:
            match_pcts = np.full_like(hybrid, 80.0)

        sorted_order = np.argsort(-hybrid)

        results = []
        for i in sorted_order[:n]:
            orig_idx = cand_indices[i]
            m = self.movies[orig_idx]
            match_pct = int(round(match_pcts[i]))
            card = self.format_card(m, match_percent=match_pct)
            best_fav = self.movies[cand_best_fav[i]]
            card["because_title"] = best_fav.get("title", "")
            results.append(card)

        return results

    def get_moods(self, languages=None):
        if not self.movies:
            return []

        lang_set = set([l.strip().lower() for l in languages if l.strip()]) if languages else None
        if lang_set:
            lang_mask = np.array([m.get("language", "").lower() in lang_set for m in self.movies], dtype=bool)
        else:
            lang_mask = np.ones(len(self.movies), dtype=bool)

        results = []
        for key, mdef in MOOD_DEFINITIONS.items():
            if key in self.mood_masks:
                mask = self.mood_masks[key] & lang_mask
                count = int(np.sum(mask))
                if count > 0:
                    results.append({
                        "key": key,
                        "label": mdef["label"],
                        "count": count
                    })
        return results

    def surprise(self, languages=None, genre=None, mood=None, exclude=None):
        if not self.movies:
            return None

        lang_set = set([l.strip().lower() for l in languages if l.strip()]) if languages else None
        exclude_set = set()
        if exclude:
            for x in exclude:
                try:
                    exclude_set.add(int(x))
                except (ValueError, TypeError):
                    pass

        candidates = []
        for idx, m in enumerate(self.movies):
            if m["id"] in exclude_set:
                continue
            if lang_set and m.get("language", "").lower() not in lang_set:
                continue
            if genre and genre not in m.get("genres", []):
                continue
            if mood and mood in self.mood_masks:
                if not self.mood_masks[mood][idx]:
                    continue
            candidates.append((idx, m))

        if not candidates:
            return None

        # Quality pool: vote_average >= 6.5 and vote_count >= 100
        quality_candidates = [
            m for idx, m in candidates
            if m.get("vote_average", 0.0) >= 6.5 and m.get("vote_count", 0) >= 100
        ]

        if len(quality_candidates) < 20:
            candidates.sort(key=lambda item: self.quality_scores[item[0]], reverse=True)
            cutoff = max(1, len(candidates) // 2)
            pool = [m for idx, m in candidates[:cutoff]]
        else:
            pool = quality_candidates

        if not pool:
            return None

        chosen_idx = np.random.randint(len(pool))
        chosen_movie = pool[chosen_idx]
        return self.format_card(chosen_movie)

    def browse(self, languages=None, genre=None, mood=None, offset=0, limit=24):
        if not self.movies or self.quality_scores is None:
            return {"total": 0, "offset": offset, "limit": limit, "items": []}

        if genre and mood:
            raise ValueError("genre and mood cannot be used together")

        lang_set = set([l.strip().lower() for l in languages if l.strip()]) if languages else None

        if mood:
            if mood not in self.mood_masks:
                return {"total": 0, "offset": offset, "limit": limit, "items": []}
            candidates = []
            mask = self.mood_masks[mood]
            scores = self.mood_scores[mood]
            for idx, m in enumerate(self.movies):
                if lang_set and m.get("language", "").lower() not in lang_set:
                    continue
                if not mask[idx]:
                    continue
                score_count = int(scores[idx])
                q_score = float(self.quality_scores[idx])
                pop_score = float(m.get("popularity", 0.0))
                candidates.append((score_count, q_score, pop_score, m))

            # Matching: at least one any genre, none of exclude genres, ordered by matched any + boost count, then quality score
            candidates.sort(key=lambda x: (x[0], x[1], x[2]), reverse=True)
            total = len(candidates)
            sliced = candidates[offset : offset + limit]
            items = [self.format_card(m) for _, _, _, m in sliced]
            return {
                "total": total,
                "offset": offset,
                "limit": limit,
                "items": items
            }

        genre_str = genre.strip() if genre else None
        candidates = []
        for idx, m in enumerate(self.movies):
            if lang_set and m.get("language", "").lower() not in lang_set:
                continue
            if genre_str and genre_str not in m.get("genres", []):
                continue
            q_score = float(self.quality_scores[idx])
            pop_score = float(m.get("popularity", 0.0))
            candidates.append((q_score, pop_score, m))

        # Ordered strictly by quality score descending, then popularity descending
        candidates.sort(key=lambda x: (x[0], x[1]), reverse=True)
        total = len(candidates)
        sliced = candidates[offset : offset + limit]
        items = [self.format_card(m) for _, _, m in sliced]

        return {
            "total": total,
            "offset": offset,
            "limit": limit,
            "items": items
        }
