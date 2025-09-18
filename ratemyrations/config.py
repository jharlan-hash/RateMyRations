import os

# Rate limiting
RATE_LIMIT_DEFAULT = os.environ.get("RATE_LIMIT_DEFAULT", "10 per minute")
RATE_LIMIT_STORAGE_URI = os.environ.get("RATE_LIMIT_STORAGE_URI", "memory://")

# Admin token for destructive endpoints
ADMIN_TOKEN = os.environ.get("ADMIN_TOKEN", "change-me")

# Caching
CACHE_MINUTES = int(os.environ.get("CACHE_MINUTES", "30"))
CACHE_MAX_SIZE = int(os.environ.get("CACHE_MAX_SIZE", "64"))

# Date constraints
MAX_DAYS_AHEAD = int(os.environ.get("MAX_DAYS_AHEAD", "14"))

# Nutrislice categories to ignore
IGNORE_CATEGORIES = [
    "Beverages",
    "Condiments",
    "Breads & Spreads, Cereal, and Waffle Bar",
    "Desserts",
    "Salad Bar",
    "Yogurt Bar",
]

# Centralized menus configuration (hall name, school slug, meal slug)
MENUS_TO_FETCH = [
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


