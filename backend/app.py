import os
import sys

# Initialize app
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from dotenv import load_dotenv

# Load recommender
try:
    from recommender import MovieRecommender
except ImportError:
    from backend.recommender import MovieRecommender

# Initialize app
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BACKEND_DIR)
DIST_DIR = os.path.join(ROOT_DIR, "frontend", "dist")

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

app = Flask(__name__, static_folder=DIST_DIR)
CORS(app)

# Initialize Recommender
recommender = MovieRecommender()


def parse_languages_param(raw_param):
    if not raw_param:
        return None
    # Can be comma-separated like 'hi,gu'
    langs = [l.strip().lower() for l in raw_param.split(",") if l.strip()]
    if not langs or "all" in langs:
        return None
    return langs


@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": "Bad Request", "message": str(error)}), 400


@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not Found", "message": str(error)}), 404


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "total_movies": len(recommender.movies),
        "available_languages": len(recommender.get_languages())
    })


@app.route("/api/languages", methods=["GET"])
def get_languages():
    languages = recommender.get_languages()
    return jsonify(languages)


@app.route("/api/search", methods=["GET"])
def search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify([])
    
    languages = parse_languages_param(request.args.get("languages"))
    try:
        limit = int(request.args.get("limit", 20))
    except ValueError:
        limit = 20
        
    results = recommender.search(query=query, languages=languages, limit=limit)
    return jsonify(results)


@app.route("/api/popular", methods=["GET"])
def popular():
    languages = parse_languages_param(request.args.get("languages"))
    try:
        n = int(request.args.get("n", 12))
    except ValueError:
        n = 12
    n = max(1, min(n, 100))
    
    results = recommender.get_popular(languages=languages, n=n)
    return jsonify(results)


@app.route("/api/recommend", methods=["GET"])
def recommend():
    movie_id = request.args.get("movie_id")
    if not movie_id:
        return jsonify({"error": "Bad Request", "message": "movie_id query parameter is required"}), 400
        
    languages = parse_languages_param(request.args.get("languages"))
    
    try:
        n = int(request.args.get("n", 12))
    except ValueError:
        n = 12
    n = max(1, min(n, 100))

    try:
        alpha = float(request.args.get("alpha", 0.7))
    except ValueError:
        alpha = 0.7
    alpha = max(0.0, min(1.0, alpha))

    results = recommender.recommend(movie_id=movie_id, languages=languages, n=n, alpha=alpha)
    return jsonify(results)


@app.route("/api/movie/<int:movie_id>", methods=["GET"])
def get_movie_detail(movie_id):
    movie = recommender.get_movie(movie_id)
    if not movie:
        return jsonify({"error": "Not Found", "message": f"Movie with ID {movie_id} not found"}), 404

    # Return full detail card with cast, trailer_key, trailers list, and language info
    card = recommender.format_card(movie)
    card["cast"] = movie.get("cast", [])
    card["director"] = movie.get("director")
    card["keywords"] = movie.get("keywords", [])
    card["vote_count"] = movie.get("vote_count", 0)
    card["popularity"] = movie.get("popularity", 0.0)
    card["trailers"] = movie.get("trailers", [])
    card["default_trailer_key"] = movie.get("default_trailer_key") or movie.get("trailer_key")
    card["original_language_name"] = movie.get("original_language_name") or movie.get("language_name")
    return jsonify(card)


# Serve React Frontend
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not Found", "message": "API route not found"}), 404

    if os.path.exists(DIST_DIR):
        file_path = os.path.join(DIST_DIR, path)
        if path and os.path.exists(file_path) and not os.path.isdir(file_path):
            return send_from_directory(DIST_DIR, path)
        return send_from_directory(DIST_DIR, "index.html")
    
    return (
        "<h1>CineMatch Backend Running</h1>"
        "<p>Frontend build (frontend/dist) not found. Run 'npm run build' in frontend directory.</p>"
    ), 200


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"Starting CineMatch server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
