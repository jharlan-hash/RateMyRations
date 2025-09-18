import urllib.request
import json
from datetime import datetime

def get_menu(dining_hall, meal, date):
    """
    Gets the menu for a specific dining hall, meal, and date.
    """
    url = f"https://dininguiowa.api.nutrislice.com/menu/api/weeks/school/{dining_hall}/menu-type/{meal}/{date.year}/{date.month}/{date.day}/?format=json"
    try:
        with urllib.request.urlopen(url) as response:
            if response.status == 200:
                data = json.loads(response.read().decode())
                for day in data.get("days", []):
                    if day.get("date") == date.strftime("%Y-%m-%d"):
                        menu_items = []
                        for item in day.get("menu_items", []):
                            if not item.get("is_section_title") and item.get("food"):
                                menu_items.append(item["food"]["name"])
                        return menu_items
    except urllib.error.URLError as e:
        print(f"Error fetching menu for {dining_hall} {meal}: {e}")
    return None

if __name__ == "__main__":
    today = datetime(2025, 9, 17)
    dining_halls = {
        "Burge": "burge-market",
        "Catlett": "catlett-market-place",
        "Hillcrest": "hillcrest-market-place",
    }
    meals = ["breakfast", "lunch", "dinner"]

    for name, school in dining_halls.items():
        print(f"--- {name} ---")
        for meal in meals:
            menu = get_menu(school, meal, today)
            if menu:
                print(f"  - {meal.capitalize()}:")
                for item in menu:
                    print(f"    - {item}")
            else:
                print(f"  - {meal.capitalize()}: Menu not available")