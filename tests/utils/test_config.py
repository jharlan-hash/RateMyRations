"""
Test configuration and utilities for RateMyRations test suite.
"""

import os
import sys
import tempfile
import sqlite3
import json
import pytest
from unittest.mock import Mock, patch
from datetime import datetime, timedelta

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

# Test configuration
TEST_DB_PATH = ":memory:"  # Use in-memory database for tests
TEST_ADMIN_TOKEN = "test-admin-token-12345"
TEST_USER_ID = "test-user-12345"

# Test data constants
SAMPLE_FOOD_ITEMS = [
    {"name": "Pizza", "station": "Main Station", "dining_hall": "Burge", "meal": "lunch"},
    {"name": "Salad", "station": "Salad Bar", "dining_hall": "Catlett", "meal": "dinner"},
    {"name": "Burger", "station": "Grill", "dining_hall": "Hillcrest", "meal": "lunch"},
]

SAMPLE_RATINGS = [
    {"food_id": 1, "user_id": "user1", "rating": 4, "date": "2024-01-15"},
    {"food_id": 1, "user_id": "user2", "rating": 5, "date": "2024-01-15"},
    {"food_id": 2, "user_id": "user1", "rating": 3, "date": "2024-01-15"},
]

SAMPLE_MENU_DATA = {
    "Burge": {
        "breakfast": {
            "Main Station": [
                {"id": 1, "name": "Scrambled Eggs", "meal": "breakfast"},
                {"id": 2, "name": "Bacon", "meal": "breakfast"}
            ]
        },
        "lunch": {
            "Main Station": [
                {"id": 3, "name": "Pizza", "meal": "lunch"},
                {"id": 4, "name": "Pasta", "meal": "lunch"}
            ]
        }
    }
}

class TestDatabase:
    """Test database utility class."""
    
    def __init__(self, db_path=":memory:"):
        self.db_path = db_path
        self.conn = None
    
    def setup(self):
        """Set up test database with tables."""
        self.conn = sqlite3.connect(self.db_path)
        self.create_tables()
        self.insert_test_data()
    
    def teardown(self):
        """Clean up test database."""
        if self.conn:
            self.conn.close()
    
    def create_tables(self):
        """Create database tables for testing."""
        c = self.conn.cursor()
        
        # Create foods table
        c.execute("""
            CREATE TABLE IF NOT EXISTS foods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                station TEXT NOT NULL,
                dining_hall TEXT NOT NULL,
                meal TEXT NOT NULL,
                UNIQUE(name, station, dining_hall, meal)
            )
        """)
        
        # Create ratings table
        c.execute("""
            CREATE TABLE IF NOT EXISTS ratings (
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
        
        # Create users table
        c.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                nickname TEXT,
                is_banned BOOLEAN DEFAULT FALSE,
                ban_reason TEXT
            )
        """)
        
        self.conn.commit()
    
    def insert_test_data(self):
        """Insert sample test data."""
        c = self.conn.cursor()
        
        # Insert sample foods
        for food in SAMPLE_FOOD_ITEMS:
            c.execute("""
                INSERT OR IGNORE INTO foods (name, station, dining_hall, meal)
                VALUES (?, ?, ?, ?)
            """, (food["name"], food["station"], food["dining_hall"], food["meal"]))
        
        # Insert sample ratings
        for rating in SAMPLE_RATINGS:
            c.execute("""
                INSERT OR IGNORE INTO ratings (food_id, user_id, rating, date)
                VALUES (?, ?, ?, ?)
            """, (rating["food_id"], rating["user_id"], rating["rating"], rating["date"]))
        
        self.conn.commit()

class MockNutrisliceAPI:
    """Mock Nutrislice API for testing."""
    
    def __init__(self):
        self.responses = {}
        self.setup_default_responses()
    
    def setup_default_responses(self):
        """Set up default mock responses."""
        self.responses = {
            "burge-market": {
                "breakfast": {
                    "menu_items": [
                        {"name": "Scrambled Eggs", "station": "Main Station"},
                        {"name": "Bacon", "station": "Main Station"}
                    ]
                },
                "lunch": {
                    "menu_items": [
                        {"name": "Pizza", "station": "Main Station"},
                        {"name": "Pasta", "station": "Main Station"}
                    ]
                }
            },
            "catlett-marketplace": {
                "lunch-2": {
                    "menu_items": [
                        {"name": "Salad", "station": "Salad Bar"},
                        {"name": "Soup", "station": "Soup Station"}
                    ]
                }
            }
        }
    
    def get_menu(self, school_id, meal, date):
        """Mock menu fetching."""
        if school_id in self.responses and meal in self.responses[school_id]:
            return self.responses[school_id][meal]
        return {"menu_items": []}

class TestClient:
    """Test client utility for API testing."""
    
    def __init__(self, app):
        self.app = app
        self.client = app.test_client()
    
    def get(self, url, **kwargs):
        """Make GET request."""
        return self.client.get(url, **kwargs)
    
    def post(self, url, data=None, json=None, headers=None, **kwargs):
        """Make POST request."""
        return self.client.post(url, data=data, json=json, headers=headers, **kwargs)
    
    def post_json(self, url, data, headers=None, **kwargs):
        """Make POST request with JSON data."""
        if headers is None:
            headers = {}
        headers['Content-Type'] = 'application/json'
        return self.post(url, json=data, headers=headers, **kwargs)

def create_test_app():
    """Create Flask app instance for testing."""
    from ratemyrations.app import app
    app.config['TESTING'] = True
    app.config['DATABASE_PATH'] = TEST_DB_PATH
    return app

def assert_valid_json_response(response, expected_status=200):
    """Assert that response is valid JSON with expected status."""
    assert response.status_code == expected_status
    assert response.content_type == 'application/json'
    return response.get_json()

def assert_error_response(response, expected_status, expected_error_msg=None):
    """Assert that response is an error with expected status and message."""
    assert response.status_code == expected_status
    if expected_error_msg:
        data = response.get_json()
        assert 'error' in data
        assert expected_error_msg in data['error']

def generate_test_date(days_offset=0):
    """Generate test date string."""
    date = datetime.now() + timedelta(days=days_offset)
    return date.strftime("%Y-%m-%d")

def create_test_rating_data(food_id=1, user_id="test-user", rating=4, date=None):
    """Create test rating data."""
    if date is None:
        date = generate_test_date()
    return {
        "food_id": food_id,
        "user_id": user_id,
        "rating": rating,
        "date": date
    }

# Pytest fixtures
@pytest.fixture
def test_db():
    """Provide test database instance."""
    db = TestDatabase()
    db.setup()
    yield db
    db.teardown()

@pytest.fixture
def test_app():
    """Provide Flask app instance for testing."""
    app = create_test_app()
    with app.app_context():
        yield app

@pytest.fixture
def client(test_app):
    """Provide test client."""
    return TestClient(test_app)

@pytest.fixture
def mock_nutrislice():
    """Provide mock Nutrislice API."""
    return MockNutrisliceAPI()

@pytest.fixture
def admin_headers():
    """Provide admin authentication headers."""
    return {"X-Admin-Token": TEST_ADMIN_TOKEN}

@pytest.fixture
def sample_menu_data():
    """Provide sample menu data."""
    return SAMPLE_MENU_DATA

@pytest.fixture
def sample_food_items():
    """Provide sample food items."""
    return SAMPLE_FOOD_ITEMS

@pytest.fixture
def sample_ratings():
    """Provide sample ratings."""
    return SAMPLE_RATINGS
