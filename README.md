# CineMatch — Multi-Language Movie Recommendation Web App

A cinematic, lightweight, multi-language movie discovery and hybrid recommendation web application inspired by Netflix and Apple TV.

CineMatch features a responsive dark-themed interface, instant multi-language filtering across 10 major Indian and international film industries, content-based TF-IDF similarity, Bayesian quality scoring, live hybrid balance tuning, and fast search.

---

## 🌟 Key Features

- **Multi-Language Discovery**: Seamlessly filter between **Hollywood (en)**, **Bollywood/Hindi (hi)**, **Gujarati (gu)**, **Tamil (ta)**, **Telugu (te)**, **Malayalam (ml)**, **Punjabi (pa)**, **Kannada (kn)**, **Marathi (mr)**, and **Bengali (bn)** cinema.
- **Cinematic Dark Theme**: Netflix x Apple TV design (`#0a0a0f` deep canvas, `#7c5cff` violet and `#f5b942` gold accents, typography using *Playfair Display* and *Inter*, 8px spacing grid, and 16px card radius).
- **Hero Stage with Backdrop Crossfade**: Dynamic background transitions, metadata chips, ratings, runtime, and quick trailer playback.
- **Hybrid Recommendation Engine**:
  - Live slider to balance **Content-Based Similarity** vs. **Bayesian Quality & Popularity**.
  - Circular SVG match percentage indicators (65%–99% match scores).
  - Language filter lock with same-language relevance bonuses when exploring globally.
- **Interactive Modals & Trailers**:
  - Cast avatars with profile photos, character roles, director, and keywords.
  - YouTube player (`youtube-nocookie.com`) loaded strictly on-demand.
  - Graceful fallback with direct YouTube search links when trailers are unavailable.
- **Instant Search with Autocomplete**:
  - Debounced (300 ms) search query across titles and original titles with poster thumbnails and keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).
- **Memory & Resource Optimized**:
  - Offline dataset pre-processed into lightweight JSON (6.46 MB total, 3,319 movies across 10 languages).
  - Sparse `float32` TF-IDF matrix with on-demand dot product calculation — **no full $N \times N$ matrix stored**, keeping memory usage well below 350 MB RAM.
  - Operates completely offline at runtime without external TMDB API calls.

---

## 🔬 How Hybrid Scoring Works

The recommendation score is calculated on demand using a convex combination of two normalized components:

$$\text{Final Score} = \alpha \cdot S_{\text{content}} + (1 - \alpha) \cdot S_{\text{quality}}$$

### 1. Content Similarity ($S_{\text{content}}$)
- Evaluated via `TfidfVectorizer` (sublinear term frequency, English stop words, unigrams and bigrams).
- Built from a weighted document representation:
  - **Genres** (weighted $3\times$)
  - **Keywords** (weighted $2\times$)
  - **Director**
  - **Top Cast Members**
  - **Plot Overview**
- When a user selects a target movie $m_t$, its unit-normalized sparse vector $v_t$ is dotted against candidate vectors $V$:
  $$\text{sim}(m_t, m_i) = v_t \cdot v_i^T$$
- Min-max normalized across candidates to $[0, 1]$.

### 2. Quality Score ($S_{\text{quality}}$)
- Combines an IMDb-style Bayesian weighted rating with log-scaled popularity:
  $$WR = \frac{v}{v + m} \cdot R + \frac{m}{v + m} \cdot C$$
  where:
  - $v$ is the movie's vote count
  - $R$ is the movie's vote average
  - $C$ is the mean vote average across the catalog
  - $m$ is the 35th percentile vote threshold (minimum 5 votes)
- Combined with log-scaled popularity:
  $$P_{\log} = \ln(1 + \text{popularity})$$
- Blended with $0.65 \cdot WR_{\text{norm}} + 0.35 \cdot P_{\text{norm}}$ and normalized to $[0, 1]$.

### 3. User Controllable $\alpha$ Slider
- $\alpha = 0.70$ (default): 70% plot, cast, and genre similarity, 30% quality/popularity.
- Adjust $\alpha \to 1.0$ for strictly thematic and storyline matches.
- Adjust $\alpha \to 0.0$ for globally acclaimed and viral hits in the selected languages.

---

## 📡 API Endpoints

The Flask server (`backend/app.py`) provides clean JSON endpoints with CORS enabled:

| Method | Endpoint | Description | Query Parameters |
|---|---|---|---|
| `GET` | `/api/health` | Healthcheck and catalog statistics | None |
| `GET` | `/api/languages` | Available languages with movie counts | None |
| `GET` | `/api/search` | Substring search with rank priority | `q` (required), `languages` (optional, e.g. `hi,gu`), `limit` |
| `GET` | `/api/popular` | Top quality-ranked titles | `languages` (optional), `n` (default 12) |
| `GET` | `/api/recommend` | On-demand hybrid recommendation | `movie_id` (required), `languages` (optional), `n` (default 12), `alpha` (default 0.7) |
| `GET` | `/api/movie/<id>` | Full movie details with cast, crew & trailer | None |
| `GET` | `/*` | Serves production React UI (`frontend/dist`) | Any non-API route |

---

## 🚀 Local Quickstart (Windows)

### Option 1: Double-click `run.bat`
Simply double-click `run.bat` in the root folder. It will:
1. Verify Python virtual environment (`venv`).
2. Install Python dependencies from `backend/requirements.txt`.
3. Install frontend dependencies from `frontend/package.json` if needed.
4. Launch the Backend on port **5001** and Frontend Dev Server on port **5174**.
5. Automatically open `http://localhost:5174` in your browser.

### Option 2: Manual Start

1. **Activate virtual environment & install requirements**:
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r backend/requirements.txt
   ```

2. **Frontend setup & build**:
   ```powershell
   cd frontend
   npm install
   npm run build
   cd ..
   ```

3. **Start backend**:
   ```powershell
   # Development / Production WSGI
   python -m waitress --listen=127.0.0.1:5001 --threads=4 backend.app:app
   ```

4. **Start frontend dev server (optional)**:
   ```powershell
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5174` (or `http://localhost:5001` to view the production build).

---

## ☁️ Deployment (Render)

A production-ready `render.yaml` and `.python-version` (3.11.9) are included:
- **Build Command**: `pip install -r backend/requirements.txt`
- **Start Command**: `gunicorn --chdir backend app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 120`
- The application automatically serves the pre-built `frontend/dist` assets and falls back to `index.html` for client routing.
- The runtime operates completely self-contained without needing TMDB API network access.

---

## 📜 TMDB Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.
