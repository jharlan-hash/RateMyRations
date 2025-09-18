
import webbrowser

def open_menus():
    """
    Opens the dining hall menus in a web browser.
    """
    dining_halls = {
        "Catlett": "https://uiowa.nutrislice.com/menu/catlett-market-place",
        "Burge": "https://uiowa.nutrislice.com/menu/burge-market-place",
        "Hillcrest": "https://uiowa.nutrislice.com/menu/hillcrest-market-place",
    }

    for name, url in dining_halls.items():
        print(f"Opening {name} menu...")
        webbrowser.open(url)

if __name__ == "__main__":
    open_menus()
