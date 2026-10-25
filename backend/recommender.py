import os
import json
import math
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer


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
        self.load_and_fit()

    def load_and_fit(self):
        if not os.path.exists(self.data_path):
            print(f"Warning: {self.data_path} not found. Recommender initialized with 0 movies.")
            return

        with open(self.data_path, "r", encoding="utf-8") as f:
            self.movies = json.load(f)

        if not self.movies:
            return

        print(f"Loaded {len(self.movies)} movies into Recommender.")

        # Indexing and language counts
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
        # Quantile threshold m (e.g. 35th percentile or min 5)
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
        print("Recommender TF-IDF and Quality matrix fitted successfully.")

    def get_movie(self, movie_id):
        try:
            mid = int(movie_id)
        except (ValueError, TypeError):
            return None
        return self.movie_map.get(mid)

    def format_card(self, movie, match_percent=None):
        if not movie:
            return None
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
            "trailer_key": movie.get("trailer_key"),
            "match_percent": match_percent
        }

    def get_languages(self):
        # Return [{code, name, count}]
        # Sort by predefined order or count
        result = []
        for m in self.movies:
            code = m.get("language", "")
            name = m.get("language_name", code)
            found = False
            for item in result:
                if item["code"] == code:
                    found = True
                    break
            if not found:
                count = self.language_counts.get(code, 0)
                result.append({"code": code, "name": name, "count": count})
        # Sort descending by count
        result.sort(key=lambda x: x["count"], reverse=True)
        return result

    def search(self, query="", languages=None, limit=20):
        if not query or not self.movies:
            return []
        
        q = query.strip().lower()
        lang_set = set([l.strip().lower() for l in languages if l.strip()]) if languages else None

        matches = []
        for idx, m in enumerate(self.movies):
            if lang_set and m.get("language", "").lower() not in lang_set:
                continue
            
            title = (m.get("title") or "").lower()
            orig_title = (m.get("original_title") or "").lower()
            
            if q in title or q in orig_title:
                matches.append((idx, m))

        # Rank search results: exact starts-with first, then by quality score
        def search_rank(item):
            idx, m = item
            t = (m.get("title") or "").lower()
            starts = 1 if t.startswith(q) else 0
            q_score = float(self.quality_scores[idx]) if self.quality_scores is not None else 0.0
            return (starts, q_score)

        matches.sort(key=search_rank, reverse=True)
        return [self.format_card(m) for _, m in matches[:limit]]

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

        # Sort by quality score descending
        candidates.sort(key=lambda x: x[2], reverse=True)
        return [self.format_card(m) for _, m, _ in candidates[:n]]

    def recommend(self, movie_id, languages=None, n=12, alpha=0.7):
        if not self.movies or self.tfidf_matrix is None:
            return []

        try:
            mid = int(movie_id)
        except (ValueError, TypeError):
            return []

        if mid not in self.id_to_idx:
            # If movie not found, fallback to popular
            return self.get_popular(languages=languages, n=n)

        target_idx = self.id_to_idx[mid]
        target_movie = self.movies[target_idx]
        target_lang = target_movie.get("language", "")

        # Compute on-demand TF-IDF cosine similarity:
        # dot product between all movie vectors and the target movie vector
        target_vec = self.tfidf_matrix[target_idx]
        sims = self.tfidf_matrix.dot(target_vec.T).toarray().ravel()

        lang_set = set([l.strip().lower() for l in languages if l.strip()]) if languages else None

        # Build candidate list excluding the target movie itself
        candidate_indices = []
        candidate_content = []
        candidate_quality = []

        for idx, m in enumerate(self.movies):
            if idx == target_idx:
                continue
            m_lang = m.get("language", "").lower()
            if lang_set and m_lang not in lang_set:
                continue
            candidate_indices.append(idx)
            candidate_content.append(sims[idx])
            candidate_quality.append(self.quality_scores[idx])

        if not candidate_indices:
            return []

        c_arr = np.array(candidate_content, dtype=np.float32)
        q_arr = np.array(candidate_quality, dtype=np.float32)

        # Min-max normalize content scores
        c_min, c_max = np.min(c_arr), np.max(c_arr)
        if c_max > c_min:
            c_norm = (c_arr - c_min) / (c_max - c_min + 1e-6)
        else:
            c_norm = np.zeros_like(c_arr)

        # Combine with quality score using alpha
        alpha = max(0.0, min(1.0, float(alpha)))
        hybrid = alpha * c_norm + (1.0 - alpha) * q_arr

        # Small same-language bonus when no language filter is selected
        if not lang_set:
            for i, idx in enumerate(candidate_indices):
                if self.movies[idx].get("language", "") == target_lang:
                    hybrid[i] += 0.05

        # Normalize final scores to match percentage (between 65% and 99% for top picks)
        h_min, h_max = np.min(hybrid), np.max(hybrid)
        if h_max > h_min:
            scaled = (hybrid - h_min) / (h_max - h_min + 1e-6)
            match_percentages = 65 + (scaled * 34)  # 65% to 99%
        else:
            match_percentages = np.full_like(hybrid, 80.0)

        # Sort candidates by hybrid score descending
        sorted_order = np.argsort(-hybrid)

        results = []
        for i in sorted_order[:n]:
            idx = candidate_indices[i]
            m = self.movies[idx]
            match_pct = int(round(match_percentages[i]))
            results.append(self.format_card(m, match_percent=match_pct))

        return results
