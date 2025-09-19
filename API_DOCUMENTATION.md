# RateMyRations API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Backend API Endpoints](#backend-api-endpoints)
3. [Database Functions](#database-functions)
4. [Frontend Components](#frontend-components)
5. [Utility Scripts](#utility-scripts)
6. [Configuration](#configuration)
7. [Usage Examples](#usage-examples)
8. [Error Handling](#error-handling)

## Overview

RateMyRations is a Flask-based web application that allows users to view University of Iowa dining hall menus and rate food items. The application consists of:

- **Backend**: Flask API server with SQLite database (WAL mode for concurrency)
- **Frontend**: HTML/CSS/JavaScript interface with localStorage for user data
- **Admin Console**: Full-featured admin interface for managing ratings and users
- **Utilities**: Menu fetching, cache warming, and production startup scripts

### Key Features

- **Dual Rating System**: Shows both personal and community ratings for each food item
- **Per-Browser Ratings**: One rating per food per browser (prevents spam, allows re-rating)
- **Smart Caching**: LRU + TTL cache with automatic warming for Gunicorn workers
- **User Management**: Admin can set nicknames, ban/unban users
- **Health Monitoring**: `/healthz` and `/readyz` endpoints for production monitoring
- **Collapsible Interface**: Expandable dining halls, meals, and stations
- **Rate Limiting**: Configurable rate limiting (default: 60 requests/minute)
- **Input Validation**: Comprehensive validation and error handling
- **Database Safety**: SQLite WAL mode with retry logic for concurrency

## Backend API Endpoints

### Public Endpoints

#### `GET /`
**Description**: Main application page  
**Response**: HTML page with menu interface  
**Example**:
```bash
curl http://localhost:8000/
```

#### `GET /about`
**Description**: About page with application information  
**Response**: HTML page  
**Example**:
```bash
curl http://localhost:8000/about
```

#### `GET /api/menus`
**Description**: Fetch dining hall menus for a specific date  
**Parameters**:
- `date` (optional): Date in YYYY-MM-DD format (defaults to today)
- `refresh` (optional): "true" to bypass cache

**Response**: JSON object with menu data
```json
{
  "Burge": {
    "breakfast": {
      "Station Name": [
        {"id": 123, "name": "Food Item", "meal": "breakfast"}
      ]
    }
  }
}
```

**Example**:
```bash
curl "http://localhost:8000/api/menus?date=2024-01-15"
curl "http://localhost:8000/api/menus?date=2024-01-15&refresh=true"
```

#### `GET /api/ratings`
**Description**: Get all food ratings aggregated by different levels  
**Parameters**:
- `date` (optional): Date in YYYY-MM-DD format to filter ratings

**Response**: JSON object with ratings data
```json
{
  "foods": {
    "Food Name_Station_Dining Hall_meal": {
      "avg_rating": 4.2,
      "rating_count": 15,
      "dist": {"1": 0, "2": 1, "3": 2, "4": 7, "5": 5}
    }
  },
  "stations": {
    "Station Name_Dining Hall": {
      "avg_rating": 3.8,
      "rating_count": 45
    }
  },
  "dining_halls": {
    "Burge": {
      "avg_rating": 3.5,
      "rating_count": 120
    }
  },
  "meals": {
    "Burge_breakfast": {
      "avg_rating": 3.2,
      "rating_count": 30
    }
  }
}
```

**Example**:
```bash
curl http://localhost:8000/api/ratings
curl "http://localhost:8000/api/ratings?date=2024-01-15"
```

#### `POST /api/rate`
**Description**: Submit a rating for a food item (per-browser, one rating per food)  
**Headers**: `Content-Type: application/json`  
**Body**:
```json
{
  "food_id": 123,
  "rating": 4,
  "user_id": "browser_id_123"
}
```

**Parameters**:
- `food_id` (int): Food item ID (required)
- `rating` (int): Rating 1-5, or 0 to delete rating (required)
- `user_id` (str): Browser/user identifier (required)

**Response**:
```json
{"status": "success"}
```

**Notes**:
- Each browser can only have one rating per food item
- Re-rating is allowed (updates existing rating)
- Rating 0 deletes the user's rating
- Banned users cannot submit ratings

**Example**:
```bash
curl -X POST http://localhost:8000/api/rate \
  -H "Content-Type: application/json" \
  -d '{"food_id": 123, "rating": 4, "user_id": "user_123"}'
```

### Health Check Endpoints

#### `GET /healthz`
**Description**: Basic health check  
**Response**:
```json
{"status": "ok"}
```

#### `GET /readyz`
**Description**: Readiness check (includes database and Redis connectivity)  
**Response**:
```json
{
  "status": "ready",
  "db": "ok",
  "redis": "ok"
}
```

**Notes**:
- Checks SQLite database connectivity
- Checks Redis connectivity (if configured)
- Returns 503 if any service is unavailable

### Cache Management

#### `GET /warm-cache`
**Description**: Warm up the cache by fetching today's menus  
**Response**:
```json
{
  "status": "success",
  "date": "2024-01-15",
  "cached_menus": 45
}
```

### Admin Endpoints

#### `GET /admin`
**Description**: Admin console page  
**Parameters**:
- `token`: Admin authentication token

**Example**:
```bash
curl "http://localhost:8000/admin?token=your_admin_token"
```

#### `GET /api/admin/ratings`
**Description**: Get all ratings with details for admin console  
**Parameters**:
- `token`: Admin authentication token

**Response**: Array of rating objects
```json
[
  {
    "id": 1,
    "user_id": "user_123",
    "rating": 4,
    "timestamp": "2024-01-15T10:30:00",
    "food_name": "Pizza",
    "station": "Main Station",
    "dining_hall": "Burge",
    "meal": "lunch",
    "date": "2024-01-15",
    "nickname": "John Doe",
    "is_banned": false
  }
]
```

#### `POST /api/admin/delete-rating`
**Description**: Delete a specific rating  
**Headers**: 
- `Content-Type: application/json`
- `X-Admin-Token: your_admin_token`

**Body**:
```json
{
  "rating_id": 123
}
```

#### `POST /api/admin/update-nickname`
**Description**: Set or update a user's nickname  
**Headers**: 
- `Content-Type: application/json`
- `X-Admin-Token: your_admin_token`

**Body**:
```json
{
  "user_id": "user_123",
  "nickname": "John Doe"
}
```

**Response**:
```json
{"status": "success"}
```

#### `POST /api/admin/ban-user`
**Description**: Ban a user from submitting ratings  
**Headers**: 
- `Content-Type: application/json`
- `X-Admin-Token: your_admin_token`

**Body**:
```json
{
  "user_id": "user_123",
  "reason": "Spam ratings"
}
```

**Response**:
```json
{"status": "success"}
```

#### `POST /api/admin/unban-user`
**Description**: Unban a user  
**Headers**: 
- `Content-Type: application/json`
- `X-Admin-Token: your_admin_token`

**Body**:
```json
{
  "user_id": "user_123"
}
```

**Response**:
```json
{"status": "success"}
```

#### `POST /api/delete-ratings`
**Description**: Delete all ratings (disabled by default)  
**Headers**: `X-Admin-Token: your_admin_token`  
**Response**:
```json
{"status": "success"}
```

**Notes**:
- This endpoint is disabled by default (`ENABLE_DELETE_RATINGS=false`)
- Requires admin token authentication

## Database Functions

### Core Functions

#### `create_tables()`
**Description**: Creates database tables if they don't exist  
**Usage**:
```python
from ratemyrations import database
database.create_tables()
```

#### `add_food(name, station, dining_hall, meal)`
**Description**: Adds a food item to the database and returns its ID  
**Parameters**:
- `name` (str): Food item name
- `station` (str): Station/section name
- `dining_hall` (str): Dining hall name
- `meal` (str): Meal type

**Returns**: `int` - Food ID  
**Example**:
```python
food_id = database.add_food("Pizza", "Main Station", "Burge", "lunch")
```

#### `add_rating(food_id, user_id, rating, date=None)`
**Description**: Adds or updates a rating for a food item  
**Parameters**:
- `food_id` (int): Food item ID
- `user_id` (str): User identifier (required)
- `rating` (int): Rating 1-5 (0 to delete rating)
- `date` (str, optional): Date in YYYY-MM-DD format (defaults to today)

**Example**:
```python
database.add_rating(123, "user_123", 4)
database.add_rating(123, "user_123", 0)  # Delete rating
database.add_rating(123, "user_123", 4, "2024-01-15")  # Specific date
```

#### `get_ratings()`
**Description**: Calculates and returns aggregated ratings  
**Returns**: Dictionary with ratings by food, station, dining hall, and meal  
**Example**:
```python
ratings = database.get_ratings()
print(ratings["foods"]["Pizza_Main Station_Burge_lunch"])
```

#### `get_all_ratings()`
**Description**: Gets all individual ratings for admin purposes  
**Returns**: List of rating dictionaries  
**Example**:
```python
all_ratings = database.get_all_ratings()
for rating in all_ratings:
    print(f"{rating['food_name']}: {rating['rating']} stars")
```

#### `delete_rating_by_id(rating_id)`
**Description**: Deletes a specific rating by ID  
**Parameters**:
- `rating_id` (int): Rating ID to delete

**Returns**: `bool` - True if deleted, False if not found  
**Example**:
```python
success = database.delete_rating_by_id(123)
```

#### `delete_all_ratings()`
**Description**: Deletes all ratings from the database  
**Example**:
```python
database.delete_all_ratings()
```

### User Management Functions

#### `update_user_nickname(user_id, nickname)`
**Description**: Sets or updates a user's nickname  
**Parameters**:
- `user_id` (str): User identifier
- `nickname` (str): Display nickname

**Returns**: `bool` - True if updated, False if not found  
**Example**:
```python
success = database.update_user_nickname("user_123", "John Doe")
```

#### `ban_user(user_id, reason=None)`
**Description**: Bans a user from submitting ratings  
**Parameters**:
- `user_id` (str): User identifier
- `reason` (str, optional): Ban reason

**Returns**: `bool` - True if banned, False if not found  
**Example**:
```python
success = database.ban_user("user_123", "Spam ratings")
```

#### `unban_user(user_id)`
**Description**: Unbans a user  
**Parameters**:
- `user_id` (str): User identifier

**Returns**: `bool` - True if unbanned, False if not found  
**Example**:
```python
success = database.unban_user("user_123")
```

#### `is_user_banned(user_id)`
**Description**: Checks if a user is banned  
**Parameters**:
- `user_id` (str): User identifier

**Returns**: `bool` - True if banned, False if not banned or not found  
**Example**:
```python
if database.is_user_banned("user_123"):
    print("User is banned")
```

## Frontend Components

### JavaScript Functions

#### `fetchRatings()`
**Description**: Fetches all ratings from the API  
**Returns**: Promise  
**Usage**:
```javascript
fetchRatings().then(() => {
    console.log("Ratings loaded");
});
```

#### `fetchMenus(date, openTabs)`
**Description**: Fetches and renders menus for a specific date  
**Parameters**:
- `date` (string): Date in YYYY-MM-DD format
- `openTabs` (Set): Set of currently open tab IDs

**Example**:
```javascript
fetchMenus("2024-01-15", new Set(["dining-hall-content-Burge"]));
```

#### `renderStars(rating, foodId, isInteractive)`
**Description**: Renders dual star rating component (community + user rating)  
**Parameters**:
- `rating` (number): Community rating value (0-5)
- `foodId` (number): Food ID for interactive ratings
- `isInteractive` (boolean): Whether stars are clickable

**Returns**: DOM element with two rows:
- Community rating (read-only with average and count)
- User rating (interactive)

**Example**:
```javascript
const stars = renderStars(4.2, 123, true);
document.body.appendChild(stars);
```

#### `filterRatingsByMenu(menuData, ratings)`
**Description**: Filters ratings based on actual menu items for the day  
**Parameters**:
- `menuData` (object): Menu data from API
- `ratings` (object): All ratings data

**Returns**: Filtered ratings object  
**Notes**:
- Handles meal slug mapping (e.g., `lunch` → `lunch-2` for Catlett)
- Recalculates aggregate ratings for stations, meals, and dining halls
- Only shows ratings for foods actually available on the selected date

**Example**:
```javascript
const filteredRatings = filterRatingsByMenu(menuData, ratings);
```

#### `getCurrentMeal(diningHall)`
**Description**: Determines current meal based on time and dining hall hours  
**Parameters**:
- `diningHall` (string): Dining hall name

**Returns**: String meal name or null  
**Example**:
```javascript
const currentMeal = getCurrentMeal("Burge");
if (currentMeal) {
    console.log(`Currently serving: ${currentMeal}`);
}
```

### CSS Classes

#### Layout Classes
- `.container`: Main page container
- `.dining-hall`: Dining hall section
- `.meal`: Meal section
- `.station`: Station/section within meal

#### Interactive Classes
- `.active`: Expanded/collapsed state
- `.star-rating`: Star rating container
- `.star`: Individual star
- `.rated`: Rated star
- `.user-rated`: User's rating star

#### Rating Classes
- `.community-rating-row`: Community rating display
- `.your-rating-row`: User rating display
- `.rating-label`: Rating label text
- `.rating-count`: Rating count display
- `.histogram`: Rating distribution bars

## Utility Scripts

### Menu Fetching Scripts

#### `get_menus.py`
**Description**: Standalone script to open dining hall menus in browser  
**Usage**:
```bash
python get_menus.py
```

**Functions**:
- `open_menus()`: Opens all dining hall menu URLs in browser

#### `menu_parser.py`
**Description**: Script to fetch and parse menu data from Nutrislice API  
**Usage**:
```bash
python menu_parser.py
```

**Functions**:
- `get_menu(dining_hall, meal, date)`: Fetches menu for specific parameters
  - `dining_hall` (str): Dining hall identifier
  - `meal` (str): Meal type
  - `date` (datetime): Date object

**Example**:
```python
from datetime import datetime
from menu_parser import get_menu

today = datetime(2024, 1, 15)
menu = get_menu("burge-market", "lunch", today)
print(menu)  # List of food items
```

### Cache Warming

#### `warm_cache.py`
**Description**: Warms up Gunicorn worker caches  
**Usage**:
```bash
python warm_cache.py http://localhost:8000
```

**Functions**:
- `warm_worker(base_url, worker_id)`: Warms a single worker
- `main()`: Main function to warm all workers

### Application Startup

#### `start.sh`
**Description**: Startup script for production deployment  
**Usage**:
```bash
./start.sh
```

**Features**:
- Starts Gunicorn with 4 workers
- Waits for startup
- Warms cache for all workers
- Provides process monitoring

## Configuration

### Environment Variables

#### Rate Limiting
- `RATE_LIMIT_DEFAULT`: Default rate limit (default: "60 per minute")
- `RATE_LIMIT_STORAGE_URI`: Rate limit storage (default: "memory://", supports Redis)

#### Admin Settings
- `ADMIN_TOKEN`: Admin authentication token (required environment variable)
- `ENABLE_DELETE_RATINGS`: Enable rating deletion (default: "false")

#### Caching
- `CACHE_MINUTES`: Cache duration in minutes (default: 30)
- `CACHE_MAX_SIZE`: Maximum cache entries (default: 64)

#### Date Constraints
- `MAX_DAYS_AHEAD`: Maximum days ahead for menu requests (default: 14)

### Configuration File (`config.py`)

#### Constants
```python
# Rate limiting
RATE_LIMIT_DEFAULT = "60 per minute"
RATE_LIMIT_STORAGE_URI = "memory://"

# Admin settings
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN")  # Required environment variable
ENABLE_DELETE_RATINGS = False

# Caching
CACHE_MINUTES = 30
CACHE_MAX_SIZE = 64

# Date constraints
MAX_DAYS_AHEAD = 14

# Nutrislice API
NUTRISLICE_BASE_URL = "https://dininguiowa.api.nutrislice.com/menu/api/weeks/school/"

# Ignored categories (beverages, condiments, etc.)
IGNORE_CATEGORIES = [
    "Beverages",
    "Condiments", 
    "Breads & Spreads, Cereal, and Waffle Bar",
    "Coffee Bar",
    "Condiments & Dressings",
    # ... more categories
]

# Menu configuration (dining hall, school ID, meal)
MENUS_TO_FETCH = [
    ("Burge", "burge-market", "breakfast"),
    ("Burge", "burge-market", "lunch"),
    ("Burge", "burge-market", "dinner-3"),
    ("Catlett", "catlett-marketplace", "breakfast-2"),
    ("Catlett", "catlett-marketplace", "lunch-2"),
    ("Catlett", "catlett-marketplace", "dinner-2"),
    ("Hillcrest", "hillcrest-marketplace", "breakfast-3"),
    ("Hillcrest", "hillcrest-marketplace", "lunch-3"),
    ("Hillcrest", "hillcrest-marketplace", "dinner"),
]
```

## Usage Examples

### Basic Menu Fetching

```python
from ratemyrations.app import fetch_all_menus
from datetime import datetime

# Fetch today's menus
date_str = datetime.now().strftime("%Y-%m-%d")
menus = fetch_all_menus(date_str)

# Access specific menu
burge_lunch = menus["Burge"]["lunch"]
for station, items in burge_lunch.items():
    print(f"{station}: {len(items)} items")
```

### Rating Management

```python
from ratemyrations import database

# Add a food item
food_id = database.add_food("Pizza", "Main Station", "Burge", "lunch")

# Add a rating
database.add_rating(food_id, "user_123", 4)

# Get aggregated ratings
ratings = database.get_ratings()
food_key = "Pizza_Main Station_Burge_lunch"
if food_key in ratings["foods"]:
    avg_rating = ratings["foods"][food_key]["avg_rating"]
    print(f"Average rating: {avg_rating}")
```

### API Integration

```python
import requests

# Fetch menus
response = requests.get("http://localhost:8000/api/menus?date=2024-01-15")
menus = response.json()

# Submit a rating
rating_data = {
    "food_id": 123,
    "rating": 4,
    "user_id": "user_123"
}
response = requests.post(
    "http://localhost:8000/api/rate",
    json=rating_data,
    headers={"Content-Type": "application/json"}
)
```

### Frontend Integration

```javascript
// Load ratings and menus
fetchRatings().then(() => {
    fetchMenus("2024-01-15");
});

// Create interactive star rating
const stars = renderStars(0, 123, true);
document.getElementById("rating-container").appendChild(stars);

// Check current meal
const currentMeal = getCurrentMeal("Burge");
if (currentMeal) {
    console.log(`Burge is currently serving: ${currentMeal}`);
}
```

### Admin Operations

```bash
# Access admin console
curl "http://localhost:8000/admin?token=your_admin_token"

# Get all ratings
curl "http://localhost:8000/api/admin/ratings?token=your_admin_token"

# Delete a rating
curl -X POST "http://localhost:8000/api/admin/delete-rating" \
  -H "X-Admin-Token: your_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"rating_id": 123}'
```

## Error Handling

### HTTP Status Codes

- `200`: Success
- `400`: Bad Request (invalid date format, missing parameters)
- `403`: Forbidden (invalid admin token)
- `404`: Not Found (disabled endpoints)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error
- `502`: Bad Gateway (menu fetch failed)
- `503`: Service Unavailable (database/Redis unavailable)

### Error Response Format

```json
{
  "error": "Error message description"
}
```

### Common Error Scenarios

1. **Invalid Date Format**:
   ```json
   {"error": "Invalid date format. Use YYYY-MM-DD."}
   ```

2. **Date Too Far Ahead**:
   ```json
   {"error": "Date too far in the future."}
   ```

3. **Rate Limit Exceeded**:
   ```json
   {"error": "Too many requests"}
   ```

4. **Menu Fetch Failure**:
   ```json
   {"error": "Failed to retrieve menus"}
   ```

5. **Database Errors**: Handled gracefully with retry logic and fallbacks

### Frontend Error Handling

```javascript
fetchMenus(date).catch(error => {
    console.error('Error fetching menus:', error);
    const container = document.getElementById("menus-container");
    container.innerHTML = `<p class="error-message">Could not load the menu at this time. Please try again later.</p>`;
});
```

---

This documentation covers all public APIs, functions, and components in the RateMyRations application. For additional support or questions, refer to the source code or contact the development team.