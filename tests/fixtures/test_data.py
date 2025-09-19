"""
Test fixtures and sample data for RateMyRations test suite.
"""

import json
import os
from datetime import datetime, timedelta


class TestFixtures:
    """Test data fixtures."""
    
    @staticmethod
    def get_sample_menu_data():
        """Get sample menu data."""
        return {
            "Burge": {
                "breakfast": {
                    "Main Station": [
                        {"id": 1, "name": "Scrambled Eggs", "meal": "breakfast"},
                        {"id": 2, "name": "Bacon", "meal": "breakfast"},
                        {"id": 3, "name": "Toast", "meal": "breakfast"}
                    ],
                    "Salad Bar": [
                        {"id": 4, "name": "Fresh Fruit", "meal": "breakfast"}
                    ]
                },
                "lunch": {
                    "Main Station": [
                        {"id": 5, "name": "Pizza", "meal": "lunch"},
                        {"id": 6, "name": "Pasta", "meal": "lunch"},
                        {"id": 7, "name": "Chicken", "meal": "lunch"}
                    ],
                    "Grill": [
                        {"id": 8, "name": "Burger", "meal": "lunch"},
                        {"id": 9, "name": "Fries", "meal": "lunch"}
                    ]
                },
                "dinner": {
                    "Main Station": [
                        {"id": 10, "name": "Steak", "meal": "dinner"},
                        {"id": 11, "name": "Salmon", "meal": "dinner"}
                    ]
                }
            },
            "Catlett": {
                "breakfast": {
                    "Omelet Bar": [
                        {"id": 12, "name": "Custom Omelet", "meal": "breakfast"},
                        {"id": 13, "name": "Eggs Benedict", "meal": "breakfast"}
                    ]
                },
                "lunch": {
                    "Za!": [
                        {"id": 14, "name": "Margherita Pizza", "meal": "lunch"},
                        {"id": 15, "name": "Pepperoni Pizza", "meal": "lunch"}
                    ],
                    "Sprouts": [
                        {"id": 16, "name": "Vegetable Soup", "meal": "lunch"},
                        {"id": 17, "name": "Grilled Cheese", "meal": "lunch"}
                    ]
                },
                "dinner": {
                    "Za!": [
                        {"id": 18, "name": "Meat Lovers Pizza", "meal": "dinner"}
                    ]
                }
            },
            "Hillcrest": {
                "breakfast": {
                    "Main Station": [
                        {"id": 19, "name": "Pancakes", "meal": "breakfast"},
                        {"id": 20, "name": "Waffles", "meal": "breakfast"}
                    ]
                },
                "lunch": {
                    "Main Station": [
                        {"id": 21, "name": "Sandwich", "meal": "lunch"},
                        {"id": 22, "name": "Soup", "meal": "lunch"}
                    ]
                },
                "dinner": {
                    "Main Station": [
                        {"id": 23, "name": "Roast Chicken", "meal": "dinner"},
                        {"id": 24, "name": "Mashed Potatoes", "meal": "dinner"}
                    ]
                }
            }
        }
    
    @staticmethod
    def get_sample_ratings_data():
        """Get sample ratings data."""
        return {
            "foods": {
                "Scrambled Eggs_Main Station_Burge_breakfast": {
                    "avg_rating": 4.2,
                    "rating_count": 15,
                    "dist": {"1": 0, "2": 1, "3": 2, "4": 7, "5": 5}
                },
                "Pizza_Main Station_Burge_lunch": {
                    "avg_rating": 3.8,
                    "rating_count": 23,
                    "dist": {"1": 1, "2": 2, "3": 5, "4": 10, "5": 5}
                },
                "Custom Omelet_Omelet Bar_Catlett_breakfast": {
                    "avg_rating": 4.5,
                    "rating_count": 8,
                    "dist": {"1": 0, "2": 0, "3": 1, "4": 2, "5": 5}
                },
                "Margherita Pizza_Za!_Catlett_lunch": {
                    "avg_rating": 4.0,
                    "rating_count": 12,
                    "dist": {"1": 0, "2": 1, "3": 2, "4": 4, "5": 5}
                }
            },
            "stations": {
                "Main Station_Burge": {
                    "avg_rating": 4.0,
                    "rating_count": 38
                },
                "Omelet Bar_Catlett": {
                    "avg_rating": 4.5,
                    "rating_count": 8
                },
                "Za!_Catlett": {
                    "avg_rating": 4.0,
                    "rating_count": 20
                }
            },
            "dining_halls": {
                "Burge": {
                    "avg_rating": 4.0,
                    "rating_count": 38
                },
                "Catlett": {
                    "avg_rating": 4.2,
                    "rating_count": 28
                },
                "Hillcrest": {
                    "avg_rating": 3.5,
                    "rating_count": 15
                }
            },
            "meals": {
                "Burge_breakfast": {
                    "avg_rating": 4.2,
                    "rating_count": 15
                },
                "Burge_lunch": {
                    "avg_rating": 3.8,
                    "rating_count": 23
                },
                "Catlett_breakfast": {
                    "avg_rating": 4.5,
                    "rating_count": 8
                },
                "Catlett_lunch": {
                    "avg_rating": 4.0,
                    "rating_count": 20
                }
            }
        }
    
    @staticmethod
    def get_sample_admin_ratings():
        """Get sample admin ratings data."""
        return [
            {
                "id": 1,
                "user_id": "user-12345",
                "rating": 4,
                "timestamp": "2024-01-15T10:30:00",
                "food_name": "Scrambled Eggs",
                "station": "Main Station",
                "dining_hall": "Burge",
                "meal": "breakfast",
                "date": "2024-01-15",
                "nickname": "John Doe",
                "is_banned": False
            },
            {
                "id": 2,
                "user_id": "user-67890",
                "rating": 5,
                "timestamp": "2024-01-15T11:15:00",
                "food_name": "Pizza",
                "station": "Main Station",
                "dining_hall": "Burge",
                "meal": "lunch",
                "date": "2024-01-15",
                "nickname": "Jane Smith",
                "is_banned": False
            },
            {
                "id": 3,
                "user_id": "user-11111",
                "rating": 2,
                "timestamp": "2024-01-15T12:00:00",
                "food_name": "Custom Omelet",
                "station": "Omelet Bar",
                "dining_hall": "Catlett",
                "meal": "breakfast",
                "date": "2024-01-15",
                "nickname": "Bob Johnson",
                "is_banned": True
            }
        ]
    
    @staticmethod
    def get_sample_users():
        """Get sample users data."""
        return [
            {
                "user_id": "user-12345",
                "nickname": "John Doe",
                "is_banned": False,
                "ban_reason": None
            },
            {
                "user_id": "user-67890",
                "nickname": "Jane Smith",
                "is_banned": False,
                "ban_reason": None
            },
            {
                "user_id": "user-11111",
                "nickname": "Bob Johnson",
                "is_banned": True,
                "ban_reason": "Spam ratings"
            },
            {
                "user_id": "user-22222",
                "nickname": None,
                "is_banned": False,
                "ban_reason": None
            }
        ]
    
    @staticmethod
    def get_sample_foods():
        """Get sample foods data."""
        return [
            {
                "id": 1,
                "name": "Scrambled Eggs",
                "station": "Main Station",
                "dining_hall": "Burge",
                "meal": "breakfast"
            },
            {
                "id": 2,
                "name": "Bacon",
                "station": "Main Station",
                "dining_hall": "Burge",
                "meal": "breakfast"
            },
            {
                "id": 5,
                "name": "Pizza",
                "station": "Main Station",
                "dining_hall": "Burge",
                "meal": "lunch"
            },
            {
                "id": 12,
                "name": "Custom Omelet",
                "station": "Omelet Bar",
                "dining_hall": "Catlett",
                "meal": "breakfast"
            },
            {
                "id": 14,
                "name": "Margherita Pizza",
                "station": "Za!",
                "dining_hall": "Catlett",
                "meal": "lunch"
            }
        ]


class TestDataGenerator:
    """Generate test data dynamically."""
    
    @staticmethod
    def generate_ratings(count=100, food_ids=None, user_ids=None):
        """Generate random ratings data."""
        import random
        
        if food_ids is None:
            food_ids = list(range(1, 25))  # Based on sample foods
        
        if user_ids is None:
            user_ids = [f"test-user-{i}" for i in range(1, 21)]
        
        ratings = []
        for _ in range(count):
            rating = {
                "food_id": random.choice(food_ids),
                "user_id": random.choice(user_ids),
                "rating": random.randint(1, 5),
                "date": TestDataGenerator.generate_random_date()
            }
            ratings.append(rating)
        
        return ratings
    
    @staticmethod
    def generate_random_date():
        """Generate random date within last 30 days."""
        import random
        
        days_ago = random.randint(0, 30)
        date = datetime.now() - timedelta(days=days_ago)
        return date.strftime("%Y-%m-%d")
    
    @staticmethod
    def generate_menu_data_for_date(date_str):
        """Generate menu data for specific date."""
        base_menu = TestFixtures.get_sample_menu_data()
        
        # Modify food IDs to be unique per date
        date_hash = hash(date_str) % 1000
        
        for dining_hall in base_menu.values():
            for meal in dining_hall.values():
                for station_items in meal.values():
                    for item in station_items:
                        item["id"] += date_hash
        
        return base_menu
    
    @staticmethod
    def generate_large_dataset():
        """Generate large dataset for performance testing."""
        return {
            "foods": TestDataGenerator.generate_foods(1000),
            "ratings": TestDataGenerator.generate_ratings(10000),
            "users": TestDataGenerator.generate_users(500)
        }
    
    @staticmethod
    def generate_foods(count):
        """Generate large number of food items."""
        foods = []
        stations = ["Main Station", "Grill", "Salad Bar", "Pizza Station", "Deli"]
        dining_halls = ["Burge", "Catlett", "Hillcrest"]
        meals = ["breakfast", "lunch", "dinner"]
        
        for i in range(count):
            food = {
                "id": i + 1,
                "name": f"Food Item {i + 1}",
                "station": stations[i % len(stations)],
                "dining_hall": dining_halls[i % len(dining_halls)],
                "meal": meals[i % len(meals)]
            }
            foods.append(food)
        
        return foods
    
    @staticmethod
    def generate_users(count):
        """Generate large number of users."""
        users = []
        
        for i in range(count):
            user = {
                "user_id": f"user-{i + 1:06d}",
                "nickname": f"User {i + 1}" if i % 3 == 0 else None,
                "is_banned": i % 20 == 0,  # 5% banned
                "ban_reason": "Spam" if i % 20 == 0 else None
            }
            users.append(user)
        
        return users


class TestConfigurations:
    """Test configuration variations."""
    
    @staticmethod
    def get_high_traffic_config():
        """Configuration for high traffic testing."""
        return {
            "RATE_LIMIT_DEFAULT": "200 per minute",
            "CACHE_MINUTES": 5,
            "CACHE_MAX_SIZE": 256,
            "MAX_DAYS_AHEAD": 30
        }
    
    @staticmethod
    def get_low_traffic_config():
        """Configuration for low traffic testing."""
        return {
            "RATE_LIMIT_DEFAULT": "10 per minute",
            "CACHE_MINUTES": 60,
            "CACHE_MAX_SIZE": 32,
            "MAX_DAYS_AHEAD": 7
        }
    
    @staticmethod
    def get_test_school_config():
        """Configuration for testing school adaptation."""
        return {
            "NUTRISLICE_BASE_URL": "https://testschool.api.nutrislice.com/menu/api/weeks/school/",
            "MENUS_TO_FETCH": [
                ("Main Dining", "main-dining", "breakfast"),
                ("Main Dining", "main-dining", "lunch"),
                ("Main Dining", "main-dining", "dinner"),
                ("Student Union", "student-union", "lunch"),
                ("Student Union", "student-union", "dinner")
            ],
            "IGNORE_CATEGORIES": [
                "Beverages",
                "Condiments",
                "Coffee Bar"
            ]
        }


class TestUtilities:
    """Test utility functions."""
    
    @staticmethod
    def create_test_database_file():
        """Create a temporary test database file."""
        import tempfile
        import sqlite3
        
        # Create temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
        temp_file.close()
        
        # Create database with test data
        conn = sqlite3.connect(temp_file.name)
        c = conn.cursor()
        
        # Create tables
        c.execute("""
            CREATE TABLE foods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                station TEXT NOT NULL,
                dining_hall TEXT NOT NULL,
                meal TEXT NOT NULL,
                UNIQUE(name, station, dining_hall, meal)
            )
        """)
        
        c.execute("""
            CREATE TABLE ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                food_id INTEGER NOT NULL,
                user_id TEXT NOT NULL,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                date TEXT DEFAULT (date('now')),
                UNIQUE(food_id, user_id, date),
                FOREIGN KEY (food_id) REFERENCES foods (id)
            )
        """)
        
        c.execute("""
            CREATE TABLE users (
                user_id TEXT PRIMARY KEY,
                nickname TEXT,
                is_banned BOOLEAN DEFAULT FALSE,
                ban_reason TEXT
            )
        """)
        
        # Insert test data
        foods = TestFixtures.get_sample_foods()
        for food in foods:
            c.execute("""
                INSERT INTO foods (name, station, dining_hall, meal)
                VALUES (?, ?, ?, ?)
            """, (food["name"], food["station"], food["dining_hall"], food["meal"]))
        
        conn.commit()
        conn.close()
        
        return temp_file.name
    
    @staticmethod
    def cleanup_test_database(db_path):
        """Clean up test database file."""
        try:
            os.unlink(db_path)
        except OSError:
            pass  # File might not exist
    
    @staticmethod
    def mock_nutrislice_response(school_id, meal, date):
        """Mock Nutrislice API response."""
        return {
            "menu_items": [
                {
                    "name": f"Test Food {school_id} {meal}",
                    "station": "Test Station",
                    "meal": meal
                }
            ]
        }
    
    @staticmethod
    def create_test_rating_request(food_id=1, user_id="test-user", rating=4):
        """Create test rating request data."""
        return {
            "food_id": food_id,
            "user_id": user_id,
            "rating": rating
        }
    
    @staticmethod
    def create_test_admin_request(action, data):
        """Create test admin request data."""
        return {
            "action": action,
            "data": data
        }
