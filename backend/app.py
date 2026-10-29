import os
import sys
import html
import re

# Initialize app
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from flask import Flask, jsonify, request, send_from_directory, Response
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from dotenv import load_dotenv

# Load recommender
from recommender import MovieRecommender

# Initialize paths
ROOT_DIR = os.path.dirname(BACKEND_DIR)
DIST_DIR = os.path.join(ROOT_DIR, "frontend", "dist")

load_dotenv(os.path.join(BACKEND_DIR, ".env"))

app = Flask(__name__, static_folder=DIST_DIR)
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)
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

    # Must ignore any languages and genre parameter and search the whole catalogue
    try:
        limit = int(request.args.get("limit", 10))
    except ValueError:
        limit = 10

    results = recommender.search(query=query, limit=limit)
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


@app.route("/api/genres", methods=["GET"])
def get_genres():
    languages = parse_languages_param(request.args.get("languages"))
    genres = recommender.get_genres(languages=languages)
    return jsonify(genres)


@app.route("/api/moods", methods=["GET"])
def get_moods():
    languages = parse_languages_param(request.args.get("languages"))
    moods = recommender.get_moods(languages=languages)
    return jsonify(moods)


@app.route("/api/browse", methods=["GET"])
def browse():
    languages = parse_languages_param(request.args.get("languages"))
    genre = request.args.get("genre")
    mood = request.args.get("mood")

    if genre and mood:
        return jsonify({"error": "Bad Request", "message": "genre and mood cannot be used together"}), 400

    try:
        offset = int(request.args.get("offset", 0))
    except ValueError:
        offset = 0
    try:
        limit = int(request.args.get("limit", 24))
    except ValueError:
        limit = 24
    offset = max(0, offset)
    limit = max(1, min(limit, 100))

    try:
        data = recommender.browse(languages=languages, genre=genre, mood=mood, offset=offset, limit=limit)
    except ValueError as e:
        return jsonify({"error": "Bad Request", "message": str(e)}), 400

    return jsonify(data)


@app.route("/api/cards", methods=["POST"])
def get_cards():
    data = request.get_json(silent=True)
    if not data or not isinstance(data.get("ids"), list):
        return jsonify({"error": "Bad Request", "message": "JSON body must contain an 'ids' list"}), 400
    cards = recommender.get_cards(data["ids"])
    return jsonify(cards)


@app.route("/api/for_you", methods=["POST"])
def for_you():
    data = request.get_json(silent=True)
    if data is None or not isinstance(data, dict) or "ids" not in data or not isinstance(data.get("ids"), list):
        return jsonify({"error": "Bad Request", "message": "JSON body must contain an 'ids' list"}), 400

    ids = data.get("ids", [])
    languages = parse_languages_param(data.get("languages"))
    try:
        n = int(data.get("n", 12))
    except (ValueError, TypeError):
        n = 12
    n = max(1, min(n, 100))

    results = recommender.picked_for_you(ids=ids, languages=languages, n=n)
    return jsonify(results)


@app.route("/api/surprise", methods=["GET"])
def surprise():
    languages = parse_languages_param(request.args.get("languages"))
    genre = request.args.get("genre")
    mood = request.args.get("mood")

    if genre and mood:
        return jsonify({"error": "Bad Request", "message": "genre and mood cannot be used together"}), 400

    exclude_raw = request.args.get("exclude")
    exclude = [x.strip() for x in exclude_raw.split(",") if x.strip()] if exclude_raw else None

    card = recommender.surprise(languages=languages, genre=genre, mood=mood, exclude=exclude)
    if not card:
        return jsonify({"error": "Not Found", "message": "No movies found matching criteria"}), 404
    return jsonify(card)


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


INDEX_HTML_TEMPLATE = None


def load_index_template():
    global INDEX_HTML_TEMPLATE
    index_file = os.path.join(DIST_DIR, "index.html")
    if os.path.exists(index_file):
        try:
            with open(index_file, "r", encoding="utf-8") as f:
                INDEX_HTML_TEMPLATE = f.read()
        except Exception as e:
            print(f"Warning: Could not read index.html: {e}")
    return INDEX_HTML_TEMPLATE


# Load template into memory at startup (<50ms response)
load_index_template()

DEFAULT_OG_DESC = (
    "Multi-Language Movie Discovery & Hybrid Content-Quality Recommender "
    "covering Hollywood, Bollywood/Hindi, Gujarati, Tollywood, Kollywood, Mollywood and Kannada cinema."
)
DEFAULT_TITLE = "CineMatch — Multi-Language Movie Recommendations"


def render_index_html(movie=None, movie_id=None):
    template = INDEX_HTML_TEMPLATE or load_index_template()
    if not template:
        return (
            "<h1>CineMatch Backend Running</h1>"
            "<p>Frontend build (frontend/dist) not found. Run 'npm run build' in frontend directory.</p>"
        ), 200, {"Content-Type": "text/html; charset=utf-8"}

    base_url = request.url_root.rstrip("/")
    default_image = f"{base_url}/og-image.png"

    if movie:
        title = f"{movie.get('title', 'CineMatch')} — CineMatch"
        raw_desc = movie.get("tagline") or movie.get("overview") or DEFAULT_OG_DESC
        if raw_desc and len(raw_desc) > 150:
            raw_desc = raw_desc[:150]
        desc = raw_desc
        image = movie.get("backdrop_url") or movie.get("poster_url") or default_image
        url = f"{base_url}/?movie={movie_id}"
    else:
        title = DEFAULT_TITLE
        desc = DEFAULT_OG_DESC
        image = default_image
        url = f"{base_url}/"

    # HTML-escape all dynamic contents
    escaped_title = html.escape(title, quote=True)
    escaped_desc = html.escape(desc, quote=True)
    escaped_image = html.escape(image, quote=True)
    escaped_url = html.escape(url, quote=True)

    # Replace <title>
    content = re.sub(
        r"<title>.*?</title>",
        f"<title>{escaped_title}</title>",
        template,
        flags=re.IGNORECASE | re.DOTALL,
    )

    # Replacement block for Open Graph & Twitter meta tags
    meta_tags_block = (
        f'    <!-- Open Graph / Facebook / WhatsApp -->\n'
        f'    <meta property="og:type" content="website" />\n'
        f'    <meta property="og:site_name" content="CineMatch" />\n'
        f'    <meta property="og:title" content="{escaped_title}" />\n'
        f'    <meta property="og:description" content="{escaped_desc}" />\n'
        f'    <meta property="og:image" content="{escaped_image}" />\n'
        f'    <meta property="og:url" content="{escaped_url}" />\n\n'
        f'    <!-- Twitter -->\n'
        f'    <meta name="twitter:card" content="summary_large_image" />\n'
        f'    <meta name="twitter:title" content="{escaped_title}" />\n'
        f'    <meta name="twitter:description" content="{escaped_desc}" />\n'
        f'    <meta name="twitter:image" content="{escaped_image}" />'
    )

    pattern = r"<!-- Open Graph / Facebook / WhatsApp -->.*?<meta name=\"twitter:image\"[^>]*>"
    if re.search(pattern, content, flags=re.DOTALL):
        content = re.sub(pattern, meta_tags_block, content, flags=re.DOTALL)
    else:
        content = content.replace("</head>", f"{meta_tags_block}\n  </head>")

    response = Response(content, status=200, mimetype="text/html")
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


# Specific routes for PWA and offline assets
@app.route("/manifest.webmanifest")
def serve_manifest():
    response = send_from_directory(DIST_DIR, "manifest.webmanifest", mimetype="application/manifest+json")
    response.headers["Cache-Control"] = "no-cache"
    return response


@app.route("/sw.js")
def serve_sw():
    response = send_from_directory(DIST_DIR, "sw.js", mimetype="application/javascript")
    response.headers["Cache-Control"] = "no-cache"
    return response


@app.route("/offline.html")
def serve_offline():
    response = send_from_directory(DIST_DIR, "offline.html", mimetype="text/html; charset=utf-8")
    response.headers["Cache-Control"] = "no-cache"
    return response


# Serve React Frontend
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    if path.startswith("api/"):
        return jsonify({"error": "Not Found", "message": "API route not found"}), 404

    # If asking for static asset file directly (e.g. assets/*.js, icon-192.png, favicon.ico)
    if path and os.path.exists(DIST_DIR):
        file_path = os.path.join(DIST_DIR, path)
        if os.path.exists(file_path) and not os.path.isdir(file_path):
            return send_from_directory(DIST_DIR, path)

    # For HTML navigations:
    movie_id_param = request.args.get("movie")
    movie = None
    valid_mid = None
    if movie_id_param:
        try:
            valid_mid = int(movie_id_param)
            movie = recommender.get_movie(valid_mid)
        except (ValueError, TypeError):
            movie = None
            valid_mid = None

    return render_index_html(movie=movie, movie_id=valid_mid)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print(f"Starting CineMatch server on port {port}...")
    app.run(host="0.0.0.0", port=port, debug=False)
