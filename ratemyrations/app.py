from flask import Flask, jsonify, request, render_template
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from datetime import datetime, timedelta
import urllib.request
from concurrent.futures import ThreadPoolExecutor
import database
import json

app = Flask(__name__, template_folder='templates')
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["10 per minute"],
    storage_uri="memory://",
)

# Cache configuration
CACHE = {}
CACHE_DURATION = timedelta(minutes=30)

def get_menu(dining_hall_name, school, meal, date):
    """
    Gets the menu for a specific dining hall, meal, and date, categorized by station.
    """
    url = f"https://dininguiowa.api.nutrislice.com/menu/api/weeks/school/{school}/menu-type/{meal}/{date.year}/{date.month}/{date.day}/?format=json"
    try:
        with urllib.request.urlopen(url) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                for day in data.get("days", []):
                    if day.get("date") == date.strftime("%Y-%m-%d"):
                        categorized_menu = {}
                        ignore_categories = [
                            "Beverages", "Condiments", "Breads & Spreads, Cereal, and Waffle Bar",
                            "Desserts", "Salad Bar", "Yogurt Bar"
                        ]
                        
                        station_map = {menu_id: station_info["section_options"]["display_name"] 
                                       for menu_id, station_info in day.get("menu_info", {}).items()}

                        for item in day.get("menu_items", []):
                            if item.get("food"):
                                station_name = station_map.get(str(item.get("menu_id")))
                                if station_name and station_name not in ignore_categories:
                                    if station_name not in categorized_menu:
                                        categorized_menu[station_name] = []
                                    
                                    food_name = item["food"]["name"]
                                    food_id = database.add_food(food_name, station_name, dining_hall_name, meal)
                                    categorized_menu[station_name].append({"id": food_id, "name": food_name, "meal": meal})

                        if not categorized_menu:
                            print(f"Menu not found for {dining_hall_name} - {meal.capitalize()} on {date.strftime('%Y-%m-%d')}")
                            return (dining_hall_name, meal, {})

                        return (dining_hall_name, meal, categorized_menu)
    except urllib.error.URLError as e:
        print(f"Error fetching menu for {dining_hall_name} - {meal.capitalize()}: {e}")
    
    print(f"Menu not found for {dining_hall_name} - {meal.capitalize()} on {date.strftime('%Y-%m-%d')}")
    return (dining_hall_name, meal, {})

def fetch_all_menus(date_str):
    date = datetime.strptime(date_str, "%Y-%m-%d")
    menus_to_fetch = [
        ("Burge", "burge-market", "breakfast"),
        ("Burge", "burge-market", "lunch"),
        ("Burge", "burge-market", "dinner-3"),
        ("Catlett", "catlett-market-place", "breakfast-2"),
        ("Catlett", "catlett-market-place", "lunch-2"),
        ("Catlett", "catlett-market-place", "dinner-2"),
        ("Hillcrest", "hillcrest-market-place", "breakfast-3"),
        ("Hillcrest", "hillcrest-market-place", "lunch-3"),
        ("Hillcrest", "hillcrest-market-place", "dinner"),
    ]
    menus = {"Burge": {}, "Catlett": {}, "Hillcrest": {}}

    with ThreadPoolExecutor() as executor:
        futures = [executor.submit(get_menu, name, school, meal, date) for name, school, meal in menus_to_fetch]
        
        for future in futures:
            dining_hall_name, meal, menu_items = future.result()
            
            meal_name = "breakfast"
            if "lunch" in meal:
                meal_name = "lunch"
            elif "dinner" in meal:
                meal_name = "dinner"

            menus[dining_hall_name][meal_name] = menu_items
            
    return menus

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/menus")
def get_menus_route():
    date_str = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))
    
    now = datetime.now()
    if CACHE.get(date_str) and now - CACHE[date_str]["timestamp"] < CACHE_DURATION:
        return jsonify(CACHE[date_str]["data"])

    menus = fetch_all_menus(date_str)
    CACHE[date_str] = {
        "data": menus,
        "timestamp": now
    }
    return jsonify(menus)

@app.route("/api/ratings")
def get_ratings_route():
    ratings = database.get_ratings()
    return jsonify(ratings)

@app.route("/api/rate", methods=["POST"])
def rate_route():
    data = request.get_json()
    database.add_rating(data["food_id"], data["rating"])
    return jsonify({"status": "success"})

@app.route("/api/delete-ratings", methods=["POST"])
def delete_ratings_route():
    database.delete_all_ratings()
    return jsonify({"status": "success"})

if __name__ == "__main__":
    database.create_tables()
    app.run(debug=True, port=8000)