# CineMatch — Multi-Language Movie Discovery & Hybrid Recommender

A cinematic, lightweight multi-language movie discovery and hybrid recommendation web application inspired by Netflix and Apple TV.

CineMatch features a responsive dark-themed interface, instant single-select cinema filtering across 7 major Indian and international film industries (plus a unified South Indian cinema filter), content-based TF-IDF similarity, Bayesian quality scoring, and fast search.

---

## 🌟 Key Features

- **Single-Select Cinema Filter**: Effortlessly switch between cinema industries with exactly one active chip:
  - **All** (Entire global catalog)
  - **Hollywood** (English / `en`)
  - **Bollywood/Hindi** (Hindi / `hi` — 1,200+ titles)
  - **Gujarati** (Gujarati / `gu` — exhaustive collection of 390+ titles)
  - **South Indian** (Unified filter covering Tamil, Telugu, Malayalam, and Kannada)
  - **Tamil** (Kollywood / `ta`)
  - **Telugu** (Tollywood / `te`)
  - **Malayalam** (Mollywood / `ml`)
  - **Kannada** (Sandalwood / `kn`)
- **Hero Stage with Dynamic Backdrop**: Real-time crossfade transitions, rating badges, runtime, genres, and instant trailer launch.
- **Fixed 70/30 Hybrid Scoring Engine**:
  - Automatically balances **70% Content Similarity** (plot, cast, keywords, genres, and director) + **30% Rating & Popularity** (Bayesian weighted rating and log-scaled popularity).
  - Clear, tasteful info tooltip explaining the hybrid concept without complicated sliders.
  - Circular SVG match ring badges displaying affinity percentages (65%–99%).
- **Interactive Modals & On-Demand Trailers**:
  - Top 6 cast avatars with profile photos and character names.
  - YouTube player (`youtube-nocookie.com`) embedded only on user action.
  - Intelligent fallback to YouTube search if a trailer is unavailable in the database.
- **Instant Search with Autocomplete**:
  - Debounced (300 ms) search across titles and original titles with poster thumbnails and full keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).
- **Memory & Resource Optimized**:
  - Offline dataset pre-processed into lightweight JSON (< 10 MB total).
  - Sparse `float32` TF-IDF matrix with on-demand dot product calculation — **no full $N \times N$ matrix stored in RAM**, keeping process memory well under 350 MB.
  - Operates completely offline at runtime without external TMDB API calls.

---

## 🔬 How Hybrid Scoring Works

The recommendation engine blends two distinct signals using a fixed 70/30 weighting:

$$\text{Final Match Score} = 0.70 \cdot S_{\text{content}} + 0.30 \cdot S_{\text{quality}}$$

### 1. Content Similarity ($S_{\text{content}}$)
- Evaluated via `TfidfVectorizer` (sublinear term frequency, unigrams & bigrams, English stop words).
- Built from a rich weighted document representation:
  - **Genres** (weighted $3\times$)
  - **Keywords** (weighted $2\times$)
  - **Director**
  - **Top Cast Members**
  - **Plot Overview**
- When a user selects a target movie $m_t$, its unit-normalized sparse vector $v_t$ is dotted against candidate vectors $V$:
  $$\text{sim}(m_t, m_i) = v_t \cdot v_i^T$$
- Min-max normalized across candidates to $[0, 1]$.

### 2. Quality Score ($S_{\text{quality}}$)
- Evaluated using an IMDb-style Bayesian weighted rating combined with log-scaled popularity:
  $$WR = \frac{v}{v + m} \cdot R + \frac{m}{v + m} \cdot C$$
  where:
  - $v$ is the movie's vote count
  - $R$ is the movie's vote average
  - $C$ is the mean vote average across the catalog
  - $m$ is the 35th percentile vote threshold (minimum 5 votes)
- Combined with log-scaled popularity:
  $$P_{\log} = \ln(1 + \text{popularity})$$
- Blended ($0.65 \cdot WR_{\text{norm}} + 0.35 \cdot P_{\text{norm}}$) and normalized to $[0, 1]$.

---

## 📡 API Endpoints

The Flask server (`backend/app.py`) provides clean JSON endpoints with CORS enabled:

| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/health` | Healthcheck and catalog statistics | None |
| `GET` | `/api/languages` | Supported languages with movie counts | None |
| `GET` | `/api/search` | Search titles and original titles | `q` (required), `languages` (optional, e.g. `ta,te,ml,kn`), `limit` |
| `GET` | `/api/popular` | Top quality-ranked titles | `languages` (optional), `n` (default 12) |
| `GET` | `/api/recommend` | On-demand 70/30 hybrid recommendations | `movie_id` (required), `languages` (optional), `n` (default 12) |
| `GET` | `/api/movie/<id>` | Full movie details with cast, crew & trailer | None |
| `GET` | `/*` | Serves production React UI (`frontend/dist`) | Any non-API route |

---

## 🚀 Local Quickstart (Windows)

### Option 1: Double-click `run.bat`
Simply double-click `run.bat` in the root folder. It will:
1. Verify the Python virtual environment (`venv`).
2. Install Python dependencies from `backend/requirements.txt`.
3. Install frontend dependencies from `frontend/package.json` if needed.
4. Launch the Backend on port **5001** and Frontend Dev Server on port **5174**.
5. Automatically open `http://localhost:5174` in your browser.

### Option 2: Manual Start

1. **Activate virtual environment & verify requirements**:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r backend/requirements.txt
   ```

2. **Frontend build**:
   ```powershell
   cd frontend
   npm install
   npm run build
   cd ..
   ```

3. **Start backend (Waitress)**:
   ```powershell
   python -m waitress --listen=127.0.0.1:5001 --threads=4 backend.app:app
   ```

4. **Start frontend dev server (optional)**:
   ```powershell
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5174` (or `http://localhost:5001` for the production build served by Flask).

---

## ☁️ Deployment (Render)

A production-ready `render.yaml` and `.python-version` (3.11.9) are included:
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120`
- Operates self-contained with all movie metadata stored in `backend/data/movies.json`.

---

## 📜 TMDB Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
