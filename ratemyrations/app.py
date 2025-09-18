from http.server import HTTPServer, BaseHTTPRequestHandler
import json
from datetime import datetime, timedelta
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse, parse_qs
import database

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
                                    categorized_menu[station_name].append({"id": food_id, "name": food_name})

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

class MenuRequestHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path == "/api/rate":
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data)
            
            database.add_rating(data["food_id"], data["rating"])
            
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode())
        elif self.path == "/api/delete-ratings":
            database.delete_all_ratings()
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode())

    def do_GET(self):
        if self.path.startswith("/api/menus"):
            query_components = parse_qs(urlparse(self.path).query)
            date_str = query_components.get("date", [datetime.now().strftime("%Y-%m-%d")])[0]
            
            now = datetime.now()
            if CACHE.get(date_str) and now - CACHE[date_str]["timestamp"] < CACHE_DURATION:
                self.send_response(200)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(CACHE[date_str]["data"]).encode())
                return

            menus = fetch_all_menus(date_str)
            CACHE[date_str] = {
                "data": menus,
                "timestamp": now
            }

            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(menus).encode())
        elif self.path == "/api/ratings":
            ratings = database.get_ratings()
            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(ratings).encode())
        elif self.path == "/":
            self.send_response(200)
            self.send_header("Content-type", "text/html")
            self.end_headers()
            with open("templates/index.html", "rb") as f:
                self.wfile.write(f.read())
        elif self.path == "/static/styles.css":
            self.send_response(200)
            self.send_header("Content-type", "text/css")
            self.end_headers()
            with open("static/styles.css", "rb") as f:
                self.wfile.write(f.read())
        elif self.path == "/static/script.js":
            self.send_response(200)
            self.send_header("Content-type", "application/javascript")
            self.end_headers()
            with open("static/script.js", "rb") as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not Found")

def run_server():
    server_address = ("", 8000)
    httpd = HTTPServer(server_address, MenuRequestHandler)
    print("Server running on port 8000...")
    httpd.serve_forever()

if __name__ == "__main__":
    database.create_tables()
    run_server()