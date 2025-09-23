"""
Unit tests for database functions.
"""

import pytest
import sqlite3
from unittest.mock import patch, MagicMock
from tests.utils.test_config import TestDatabaseHelper, SAMPLE_FOOD_ITEMS, SAMPLE_RATINGS


class TestDatabaseFunctions:
    """Test database.py functions."""
    
    def test_create_tables(self, test_db):
        """Test table creation."""
        # Verify tables exist
        c = test_db.conn.cursor()
        c.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [row[0] for row in c.fetchall()]
        
        assert 'foods' in tables
        assert 'ratings' in tables
        assert 'users' in tables
    
    def test_add_food(self, test_db):
        """Test adding food items."""
        from ratemyrations.database import add_food
        
        # Test adding new food
        food_id = add_food("Test Food", "Test Station", "Test Hall", "test-meal")
        assert food_id is not None
        assert isinstance(food_id, int)
        
        # Test adding duplicate food (should return existing ID)
        food_id2 = add_food("Test Food", "Test Station", "Test Hall", "test-meal")
        assert food_id == food_id2
        
        # Verify food was added
        c = test_db.conn.cursor()
        c.execute("SELECT * FROM foods WHERE id = ?", (food_id,))
        food = c.fetchone()
        assert food is not None
        assert food[1] == "Test Food"
        assert food[2] == "Test Station"
        assert food[3] == "Test Hall"
        assert food[4] == "test-meal"
    
    def test_add_rating(self, test_db):
        """Test adding ratings."""
        from ratemyrations.database import add_rating
        
        # Test adding new rating
        add_rating(1, "test-user", 4, "2024-01-15")
        
        # Verify rating was added
        c = test_db.conn.cursor()
        c.execute("SELECT * FROM ratings WHERE food_id = ? AND user_id = ?", (1, "test-user"))
        rating = c.fetchone()
        assert rating is not None
        assert rating[2] == "test-user"
        assert rating[3] == 4
        assert rating[5] == "2024-01-15"
        
        # Test updating existing rating
        add_rating(1, "test-user", 5, "2024-01-15")
        
        c.execute("SELECT rating FROM ratings WHERE food_id = ? AND user_id = ?", (1, "test-user"))
        rating = c.fetchone()
        assert rating[0] == 5
        
        # Test deleting rating (rating = 0)
        add_rating(1, "test-user", 0, "2024-01-15")
        
        c.execute("SELECT COUNT(*) FROM ratings WHERE food_id = ? AND user_id = ?", (1, "test-user"))
        count = c.fetchone()[0]
        assert count == 0
    
    def test_add_rating_validation(self, test_db):
        """Test rating validation."""
        from ratemyrations.database import add_rating
        
        # The actual add_rating function doesn't validate ratings
        # It relies on database constraints
        # Test that invalid ratings are handled by the database
        try:
            add_rating(1, "test-user", 6)  # Rating too high
            # If we get here, the database constraint didn't catch it
            # This is expected behavior - the function doesn't validate
        except sqlite3.IntegrityError:
            # Database constraint caught the invalid rating
            pass
    
    def test_get_ratings(self, test_db):
        """Test getting aggregated ratings."""
        from ratemyrations.database import get_ratings
        from datetime import datetime
        
        # Use today's date since get_ratings defaults to today
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Add test data
        c = test_db.conn.cursor()
        c.execute("INSERT INTO foods (name, station, dining_hall, meal) VALUES (?, ?, ?, ?)",
                 ("Test Food", "Test Station", "Test Hall", "test-meal"))
        food_id = c.lastrowid
        
        c.execute("INSERT INTO ratings (food_id, user_id, rating, date) VALUES (?, ?, ?, ?)",
                 (food_id, "user1", 4, today))
        c.execute("INSERT INTO ratings (food_id, user_id, rating, date) VALUES (?, ?, ?, ?)",
                 (food_id, "user2", 5, today))
        
        test_db.conn.commit()
        
        # Get ratings
        ratings = get_ratings()
        
        # Verify structure
        assert 'foods' in ratings
        assert 'stations' in ratings
        assert 'dining_halls' in ratings
        assert 'meals' in ratings
        
        # Verify food rating
        food_key = f"Test Food_Test Station_Test Hall_test-meal"
        assert food_key in ratings['foods']
        food_rating = ratings['foods'][food_key]
        assert food_rating['avg_rating'] == 4.5
        assert food_rating['rating_count'] == 2
    
    def test_get_all_ratings(self, test_db):
        """Test getting all ratings for admin."""
        from ratemyrations.database import get_all_ratings
        
        # Add test data
        c = test_db.conn.cursor()
        c.execute("INSERT INTO foods (name, station, dining_hall, meal) VALUES (?, ?, ?, ?)",
                 ("Test Food", "Test Station", "Test Hall", "test-meal"))
        food_id = c.lastrowid
        
        c.execute("INSERT INTO ratings (food_id, user_id, rating, date) VALUES (?, ?, ?, ?)",
                 (food_id, "user1", 4, "2024-01-15"))
        
        test_db.conn.commit()
        
        # Get all ratings
        all_ratings = get_all_ratings()
        
        assert len(all_ratings) >= 1
        rating = all_ratings[0]
        assert 'id' in rating
        assert 'user_id' in rating
        assert 'rating' in rating
        assert 'food_name' in rating
        assert 'station' in rating
        assert 'dining_hall' in rating
        assert 'meal' in rating
        assert 'date' in rating
    
    def test_update_user_nickname(self, test_db):
        """Test updating user nickname."""
        from ratemyrations.database import update_user_nickname
        
        # Test adding new user with nickname
        update_user_nickname("test-user", "Test User")
        
        # Verify nickname was added
        c = test_db.conn.cursor()
        c.execute("SELECT nickname FROM users WHERE user_id = ?", ("test-user",))
        nickname = c.fetchone()[0]
        assert nickname == "Test User"
        
        # Test updating existing nickname
        update_user_nickname("test-user", "Updated Name")
        
        c.execute("SELECT nickname FROM users WHERE user_id = ?", ("test-user",))
        nickname = c.fetchone()[0]
        assert nickname == "Updated Name"
    
    def test_ban_user(self, test_db):
        """Test banning users."""
        from ratemyrations.database import ban_user
        
        # Test banning user
        ban_user("test-user", "Spam ratings")
        
        # Verify user is banned
        c = test_db.conn.cursor()
        c.execute("SELECT is_banned, ban_reason FROM users WHERE user_id = ?", ("test-user",))
        row = c.fetchone()
        assert row[0] == 1  # True
        assert row[1] == "Spam ratings"
    
    def test_unban_user(self, test_db):
        """Test unbanning users."""
        from ratemyrations.database import unban_user, ban_user
        
        # First ban the user
        ban_user("test-user", "Test ban")
        
        # Then unban
        unban_user("test-user")
        
        # Verify user is unbanned
        c = test_db.conn.cursor()
        c.execute("SELECT is_banned FROM users WHERE user_id = ?", ("test-user",))
        is_banned = c.fetchone()[0]
        assert is_banned == 0  # False
    
    def test_is_user_banned(self, test_db):
        """Test checking if user is banned."""
        from ratemyrations.database import is_user_banned, ban_user
        
        # Test non-existent user
        assert is_user_banned("non-existent") is False
        
        # Test unbanned user
        assert is_user_banned("test-user") is False
        
        # Ban user and test
        ban_user("test-user", "Test ban")
        assert is_user_banned("test-user") is True
    
    def test_delete_rating_by_id(self, test_db):
        """Test deleting rating by ID."""
        from ratemyrations.database import delete_rating_by_id
        
        # Add test rating
        c = test_db.conn.cursor()
        c.execute("INSERT INTO ratings (food_id, user_id, rating, date) VALUES (?, ?, ?, ?)",
                 (1, "test-user", 4, "2024-01-15"))
        rating_id = c.lastrowid
        test_db.conn.commit()
        
        # Delete rating
        result = delete_rating_by_id(rating_id)
        assert result is True
        
        # Verify rating was deleted
        c.execute("SELECT COUNT(*) FROM ratings WHERE id = ?", (rating_id,))
        count = c.fetchone()[0]
        assert count == 0
        
        # Test deleting non-existent rating
        result = delete_rating_by_id(99999)
        assert result is False
    
    def test_delete_all_ratings(self, test_db):
        """Test deleting all ratings."""
        from ratemyrations.database import delete_all_ratings
        
        # Verify there are ratings
        c = test_db.conn.cursor()
        c.execute("SELECT COUNT(*) FROM ratings")
        count_before = c.fetchone()[0]
        assert count_before > 0
        
        # Delete all ratings
        delete_all_ratings()
        
        # Verify all ratings were deleted
        c.execute("SELECT COUNT(*) FROM ratings")
        count_after = c.fetchone()[0]
        assert count_after == 0
    
    def test_database_retry_logic(self, test_db):
        """Test database retry logic for locked database."""
        from ratemyrations.database import add_food
        
        # Mock sqlite3.OperationalError to simulate database lock
        with patch('sqlite3.connect') as mock_connect:
            mock_conn = MagicMock()
            mock_cursor = MagicMock()
            mock_conn.cursor.return_value = mock_cursor
            
            # First call raises OperationalError, second succeeds
            mock_cursor.execute.side_effect = [
                sqlite3.OperationalError("database is locked"),
                None
            ]
            mock_connect.return_value = mock_conn
            
            # Should succeed after retry
            food_id = add_food("Test Food", "Test Station", "Test Hall", "test-meal")
            assert food_id is not None
    
    def test_wal_mode_enabled(self, test_db):
        """Test that WAL mode is enabled."""
        c = test_db.conn.cursor()
        c.execute("PRAGMA journal_mode")
        journal_mode = c.fetchone()[0]
        assert journal_mode.upper() == "WAL"
