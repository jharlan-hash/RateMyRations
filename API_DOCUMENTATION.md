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

- **Backend**: Flask API server with SQLite database
- **Frontend**: HTML/CSS/JavaScript interface
- **Utilities**: Menu fetching and cache warming scripts

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
```

#### `POST /api/rate`
**Description**: Submit a rating for a food item  
**Headers**: `Content-Type: application/json`  
**Body**:
```json
{
  "food_id": 123,
  "rating": 4,
  "user_id": "browser_id_123"
}
```

**Response**:
```json
{"status": "success"}
```

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
    "meal": "lunch"
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

#### `POST /api/delete-ratings`
**Description**: Delete all ratings (if enabled)  
**Headers**: `X-Admin-Token: your_admin_token`  
**Response**:
```json
{"status": "success"}
```

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

#### `add_rating(food_id, user_id, rating)`
**Description**: Adds or updates a rating for a food item  
**Parameters**:
- `food_id` (int): Food item ID
- `user_id` (str): User identifier (can be None for legacy)
- `rating` (int): Rating 1-5 (0 to delete rating)

**Example**:
```python
database.add_rating(123, "user_123", 4)
database.add_rating(123, "user_123", 0)  # Delete rating
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
**Description**: Renders star rating component  
**Parameters**:
- `rating` (number): Rating value (0-5)
- `foodId` (number): Food ID for interactive ratings
- `isInteractive` (boolean): Whether stars are clickable

**Returns**: DOM element  
**Example**:
```javascript
const stars = renderStars(4.2, 123, true);
document.body.appendChild(stars);
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
- `RATE_LIMIT_DEFAULT`: Default rate limit (default: "10 per minute")
- `RATE_LIMIT_STORAGE_URI`: Rate limit storage (default: "memory://")

#### Admin Settings
- `ADMIN_TOKEN`: Admin authentication token (default: "change-me")
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
RATE_LIMIT_DEFAULT = "10 per minute"
RATE_LIMIT_STORAGE_URI = "memory://"

# Admin settings
ADMIN_TOKEN = "change-me"
ENABLE_DELETE_RATINGS = False

# Caching
CACHE_MINUTES = 30
CACHE_MAX_SIZE = 64

# Date constraints
MAX_DAYS_AHEAD = 14

# Ignored categories
IGNORE_CATEGORIES = [
    "Beverages",
    "Condiments",
    "Breads & Spreads, Cereal, and Waffle Bar",
    # ... more categories
]

# Menu configuration
MENUS_TO_FETCH = [
    ("Burge", "burge-market", "breakfast"),
    ("Burge", "burge-market", "lunch"),
    # ... more menu configurations
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