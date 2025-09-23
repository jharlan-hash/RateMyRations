from flask import Flask, jsonify, request, render_template
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.middleware.proxy_fix import ProxyFix
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
import json
import os
from collections import OrderedDict

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from . import database
from . import config

app = Flask(__name__, template_folder='templates')

# Respect X-Forwarded-* headers behind proxies/load balancers
app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)

# Configure rate limiting (supports Redis if configured)
rate_limit_storage_uri = os.environ.get("RATE_LIMIT_STORAGE_URI", config.RATE_LIMIT_STORAGE_URI)
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=[config.RATE_LIMIT_DEFAULT],
    storage_uri=rate_limit_storage_uri,
)

# Cache configuration (LRU with TTL)
import threading
CACHE_LOCK = threading.RLock()
CACHE = OrderedDict()
CACHE_DURATION = timedelta(minutes=config.CACHE_MINUTES)
CACHE_MAX_SIZE = config.CACHE_MAX_SIZE

# Pre-warm cache for common dates
def warm_cache_for_date(date_str):
    """Pre-warm cache for a specific date."""
    try:
        with CACHE_LOCK:
            if date_str in CACHE:
                return  # Already cached
        
        menus = fetch_all_menus(date_str)
        
        with CACHE_LOCK:
            CACHE[date_str] = {
                "data": menus,
                "timestamp": datetime.now()
            }
            CACHE.move_to_end(date_str)
            
            # Enforce cache size limit
            while len(CACHE) > CACHE_MAX_SIZE:
                CACHE.popitem(last=False)
                
    except Exception as e:
        print(f"Error warming cache for {date_str}: {e}")

# Background cache warming
import atexit
from threading import Thread

def background_cache_warming():
    """Warm cache for today and tomorrow in background."""
    try:
        today = datetime.now().strftime("%Y-%m-%d")
        tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        
        warm_cache_for_date(today)
        warm_cache_for_date(tomorrow)
        
        print(f"Cache warmed for {today} and {tomorrow}")
    except Exception as e:
        print(f"Background cache warming failed: {e}")

# Start background cache warming
cache_thread = Thread(target=background_cache_warming, daemon=True)
cache_thread.start()


def _requests_session():
    session = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=0.5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
        raise_on_status=False,
    )
    adapter = HTTPAdapter(max_retries=retries)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.update({"User-Agent": "RateMyRations/1.0"})
    return session

HTTP = _requests_session()

def get_menu(dining_hall_name, school, meal, date):
    """
    Gets the menu for a specific dining hall, meal, and date, categorized by station.
    """
    url = f"{config.NUTRISLICE_BASE_URL}/menu/api/weeks/school/{school}/menu-type/{meal}/{date.year}/{date.month}/{date.day}/?format=json"
    try:
        resp = HTTP.get(url, timeout=(3, 10))
        if resp.status_code != 200:
            print(f"HTTP {resp.status_code} error fetching menu for {dining_hall_name} - {meal.capitalize()}")
            return (dining_hall_name, meal, {})
        
        data = resp.json()
        if not isinstance(data, dict) or "days" not in data:
            print(f"Invalid response format for {dining_hall_name} - {meal.capitalize()}")
            return (dining_hall_name, meal, {})
            
        for day in data.get("days", []):
            if day.get("date") == date.strftime("%Y-%m-%d"):
                categorized_menu = {}
                ignore_categories = config.IGNORE_CATEGORIES

                station_map = {menu_id: station_info["section_options"]["display_name"]
                               for menu_id, station_info in day.get("menu_info", {}).items()}

                # Batch food additions for better performance
                foods_to_add = []
                for item in day.get("menu_items", []):
                    if item.get("food"):
                        station_name = station_map.get(str(item.get("menu_id")))
                        if station_name and station_name not in ignore_categories:
                            if station_name not in categorized_menu:
                                categorized_menu[station_name] = []

                            food_name = item["food"]["name"]
                            foods_to_add.append((food_name, station_name, dining_hall_name, meal))
                
                # Add all foods in batch
                food_ids = database.add_foods_batch(foods_to_add)
                
                # Build categorized menu with IDs
                food_idx = 0
                for item in day.get("menu_items", []):
                    if item.get("food"):
                        station_name = station_map.get(str(item.get("menu_id")))
                        if station_name and station_name not in ignore_categories:
                            food_name = item["food"]["name"]
                            food_id = food_ids[food_idx]
                            categorized_menu[station_name].append({"id": food_id, "name": food_name, "meal": meal})
                            food_idx += 1

                if not categorized_menu:
                    print(f"No menu items found for {dining_hall_name} - {meal.capitalize()} on {date.strftime('%Y-%m-%d')}")
                    return (dining_hall_name, meal, {})

                return (dining_hall_name, meal, categorized_menu)
                
        print(f"No menu data for date {date.strftime('%Y-%m-%d')} for {dining_hall_name} - {meal.capitalize()}")
        return (dining_hall_name, meal, {})
        
    except requests.exceptions.Timeout:
        print(f"Timeout fetching menu for {dining_hall_name} - {meal.capitalize()}")
        return (dining_hall_name, meal, {})
    except requests.exceptions.RequestException as e:
        print(f"Request error fetching menu for {dining_hall_name} - {meal.capitalize()}: {e}")
        return (dining_hall_name, meal, {})
    except (KeyError, TypeError, ValueError) as e:
        print(f"Data parsing error for {dining_hall_name} - {meal.capitalize()}: {e}")
        return (dining_hall_name, meal, {})
    except Exception as e:
        print(f"Unexpected error fetching menu for {dining_hall_name} - {meal.capitalize()}: {e}")
        return (dining_hall_name, meal, {})

def fetch_all_menus(date_str):
    date = datetime.strptime(date_str, "%Y-%m-%d")
    menus_to_fetch = config.MENUS_TO_FETCH
    menus = {"Burge": {}, "Catlett": {}, "Hillcrest": {}}

    with ThreadPoolExecutor(max_workers=len(menus_to_fetch)) as executor:
        futures = [executor.submit(get_menu, name, school, meal, date) for name, school, meal in menus_to_fetch]

        for future in futures:
            try:
                dining_hall_name, meal, menu_items = future.result(timeout=15)
                
                meal_name = "breakfast"
                if "lunch" in meal:
                    meal_name = "lunch"
                elif "dinner" in meal:
                    meal_name = "dinner"

                # Only add non-empty menus to reduce data transfer
                if menu_items:
                    menus[dining_hall_name][meal_name] = menu_items
            except Exception as e:
                print(f"Error processing menu future: {e}")
                continue

    return menus

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/admin")
def admin():
    token = request.args.get("token")
    if not token or token != config.ADMIN_TOKEN:
        return jsonify({"error": "Forbidden"}), 403
    return render_template("admin.html")


@app.route("/api/admin/ratings")
def get_admin_ratings():
    token = request.args.get("token")
    if not token or token != config.ADMIN_TOKEN:
        return jsonify({"error": "Forbidden"}), 403
    
    ratings = database.get_all_ratings()
    return jsonify(ratings)


@app.route("/api/admin/update-nickname", methods=["POST"])
def update_nickname():
    token = request.headers.get("X-Admin-Token")
    if not token or token != config.ADMIN_TOKEN:
        return jsonify({"error": "Forbidden"}), 403
    
    data = request.get_json()
    user_id = data.get("user_id")
    nickname = data.get("nickname")
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    database.update_user_nickname(user_id, nickname)
    return jsonify({"status": "success"})


@app.route("/api/admin/ban-user", methods=["POST"])
def ban_user():
    token = request.headers.get("X-Admin-Token")
    if not token or token != config.ADMIN_TOKEN:
        return jsonify({"error": "Forbidden"}), 403
    
    data = request.get_json()
    user_id = data.get("user_id")
    ban_reason = data.get("ban_reason", "")
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    database.ban_user(user_id, ban_reason)
    return jsonify({"status": "success"})


@app.route("/api/admin/unban-user", methods=["POST"])
def unban_user():
    token = request.headers.get("X-Admin-Token")
    if not token or token != config.ADMIN_TOKEN:
        return jsonify({"error": "Forbidden"}), 403
    
    data = request.get_json()
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"error": "user_id required"}), 400
    
    database.unban_user(user_id)
    return jsonify({"status": "success"})


@app.route("/api/admin/delete-rating", methods=["POST"])
def delete_admin_rating():
    token = request.headers.get("X-Admin-Token")
    if not token or token != config.ADMIN_TOKEN:
        return jsonify({"error": "Forbidden"}), 403
    
    data = request.get_json()
    rating_id = data.get("rating_id")
    
    if not rating_id:
        return jsonify({"error": "rating_id required"}), 400
    
    success = database.delete_rating_by_id(rating_id)
    if success:
        return jsonify({"status": "success"})
    else:
        return jsonify({"error": "Rating not found"}), 404

@app.route("/api/menus")
def get_menus_route():
    start_time = datetime.now()
    date_str = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    refresh = request.args.get("refresh", "false").lower() == "true"

    # Validate date input
    try:
        date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

    # Enforce date range if configured
    now = datetime.now()
    days_diff = (date_obj - now).days
    
    if config.MAX_DAYS_AHEAD is not None and days_diff > config.MAX_DAYS_AHEAD:
        return jsonify({"error": "Date too far in the future."}), 400
    
    # Don't allow dates too far in the past (more than 30 days ago)
    if days_diff < -30:
        return jsonify({"error": "Date too far in the past. Please select a date within the last 30 days."}), 400
    
        # Thread-safe cache access
        with CACHE_LOCK:
            cached = CACHE.get(date_str)
            if cached and now - cached["timestamp"] < CACHE_DURATION and not refresh:
                # Move to end to mark as most-recently used
                CACHE.move_to_end(date_str)
                response_time = (datetime.now() - start_time).total_seconds()
                print(f"Cache hit for {date_str} in {response_time:.3f}s")
                return jsonify(cached["data"])

    try:
        menus = fetch_all_menus(date_str)
        payload = {"data": menus, "timestamp": now}
        
        # Thread-safe cache update
        with CACHE_LOCK:
            CACHE[date_str] = payload
            CACHE.move_to_end(date_str)
            while len(CACHE) > CACHE_MAX_SIZE:
                CACHE.popitem(last=False)
        
        response_time = (datetime.now() - start_time).total_seconds()
        print(f"Menu fetch for {date_str} completed in {response_time:.3f}s")
        return jsonify(menus)
    except Exception as e:
        print(f"Error fetching menus for {date_str}: {e}")
        
        # Thread-safe cache access for fallback
        with CACHE_LOCK:
            cached = CACHE.get(date_str)
            if cached:
                response_time = (datetime.now() - start_time).total_seconds()
                print(f"Fallback cache hit for {date_str} in {response_time:.3f}s")
                return jsonify({"stale": True, **cached["data"]}), 200
        
        return jsonify({"error": "Failed to retrieve menus"}), 502

@app.route("/api/ratings")
def get_ratings_route():
    date_str = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    ratings = database.get_ratings(date_str)
    return jsonify(ratings)


@app.errorhandler(429)
def rate_limit_handler(e):
    return jsonify({"error": "Too many requests"}), 429


@app.errorhandler(500)
def internal_error_handler(e):
    return jsonify({"error": "Internal server error"}), 500

@app.route("/api/rate", methods=["POST"])
def rate_route():
    start_time = datetime.now()
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON data"}), 400
    
    user_id = data.get("user_id")
    date_str = data.get("date", datetime.now().strftime("%Y-%m-%d"))
    food_id = data.get("food_id")
    rating = data.get("rating")
    
    # Validate required fields
    if not food_id:
        return jsonify({"error": "food_id is required"}), 400
    
    # Validate rating value
    if rating is None:
        return jsonify({"error": "rating is required"}), 400
    
    try:
        rating = int(rating)
    except (ValueError, TypeError):
        return jsonify({"error": "rating must be a number"}), 400
    
    if rating not in [0, 1, 2, 3, 4, 5]:
        return jsonify({"error": "rating must be between 0 and 5"}), 400
    
    # Check if user is banned
    if user_id and database.is_user_banned(user_id):
        return jsonify({"error": "User is banned"}), 403
    
    database.add_rating(food_id, user_id, rating, date_str)
    response_time = (datetime.now() - start_time).total_seconds()
    print(f"Rating submission completed in {response_time:.3f}s")
    return jsonify({"status": "success"})

@app.route("/api/delete-ratings", methods=["POST"])
def delete_ratings_route():
    if not config.ENABLE_DELETE_RATINGS:
        return jsonify({"error": "Disabled"}), 404
    token = request.headers.get("X-Admin-Token")
    if not token or token != config.ADMIN_TOKEN:
        return jsonify({"error": "Forbidden"}), 403
    database.delete_all_ratings()
    return jsonify({"status": "success"})


@app.route("/healthz")
def healthz():
    return jsonify({"status": "ok"})


@app.route("/warm-cache")
def warm_cache():
    """Warm up the cache for all workers by fetching today's menus."""
    try:
        date_str = datetime.now().strftime("%Y-%m-%d")
        menus = fetch_all_menus(date_str)
        
        # Store in cache (thread-safe)
        with CACHE_LOCK:
            CACHE[date_str] = {
                "data": menus,
                "timestamp": datetime.now()
            }
            CACHE.move_to_end(date_str)
        
        return jsonify({
            "status": "success", 
            "date": date_str,
            "cached_menus": len([item for hall in menus.values() for meal in hall.values() for station in meal.values() for item in station])
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/readyz")
def readyz():
    # Check DB connectivity
    try:
        _ = database.get_ratings()
    except Exception as e:
        return jsonify({"status": "unready", "db": str(e)}), 503

    # Check Redis for rate limiting if configured
    info = {"status": "ready", "db": "ok"}
    try:
        if rate_limit_storage_uri.startswith("redis://"):
            import redis
            url = rate_limit_storage_uri.replace("redis://", "")
            host_port_db = url.split("/")
            host_port = host_port_db[0]
            db = int(host_port_db[1]) if len(host_port_db) > 1 else 0
            host, port = host_port.split(":")
            r = redis.Redis(host=host, port=int(port), db=db)
            r.ping()
            info["redis"] = "ok"
        else:
            info["redis"] = "not_configured"
    except Exception as e:
        return jsonify({"status": "unready", "db": "ok", "redis": str(e)}), 503

    return jsonify(info)

if __name__ == "__main__":
    database.create_tables()
    app.run(debug=True, port=8000)
