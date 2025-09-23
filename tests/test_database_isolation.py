"""
Test to verify that tests don't affect the main database.
"""

import pytest
import os
import sqlite3
from pathlib import Path
from tests.utils.test_config import TestDatabaseHelper


class TestDatabaseIsolation:
    """Test that database isolation is working correctly."""
    
    def test_main_database_not_used_in_tests(self):
        """Test that the main database is not used during tests."""
        # Set environment variable to skip safety check for this test
        os.environ["SKIP_DB_SAFETY_CHECK"] = "1"
        
        try:
            # Get the main database path
            main_db_path = os.path.join(
                os.path.dirname(__file__), "..", "ratemyrations", "ratings.db"
            )
            main_db_path = os.path.abspath(main_db_path)
            
            # Verify main database exists
            assert os.path.exists(main_db_path), "Main database should exist"
            
            # Get initial state of main database
            main_conn = sqlite3.connect(main_db_path)
            main_cursor = main_conn.cursor()
            
            # Count initial records
            main_cursor.execute("SELECT COUNT(*) FROM foods")
            initial_food_count = main_cursor.fetchone()[0]
            
            main_cursor.execute("SELECT COUNT(*) FROM ratings")
            initial_rating_count = main_cursor.fetchone()[0]
            
            main_conn.close()
            
            # Run tests with test database
            test_db = TestDatabaseHelper()
            test_db.setup()
            
            try:
                # Get initial count in test database (after sample data)
                test_cursor = test_db.conn.cursor()
                test_cursor.execute("SELECT COUNT(*) FROM foods")
                initial_test_food_count = test_cursor.fetchone()[0]
                
                test_cursor.execute("SELECT COUNT(*) FROM ratings")
                initial_test_rating_count = test_cursor.fetchone()[0]
                
                # Add additional test data to test database
                test_cursor.execute("INSERT INTO foods (name, station, dining_hall, meal) VALUES (?, ?, ?, ?)",
                                  ("Test Food", "Test Station", "Test Hall", "test-meal"))
                test_cursor.execute("INSERT INTO ratings (food_id, user_id, rating) VALUES (?, ?, ?)",
                                  (1, "test-user", 5))
                test_db.conn.commit()
                
                # Verify test data was added to test database
                test_cursor.execute("SELECT COUNT(*) FROM foods")
                test_food_count = test_cursor.fetchone()[0]
                assert test_food_count == initial_test_food_count + 1, "Test food should be added to test database"
                
                test_cursor.execute("SELECT COUNT(*) FROM ratings")
                test_rating_count = test_cursor.fetchone()[0]
                assert test_rating_count == initial_test_rating_count + 1, "Test rating should be added to test database"
                
            finally:
                test_db.teardown()
            
            # Verify main database was not affected
            main_conn = sqlite3.connect(main_db_path)
            main_cursor = main_conn.cursor()
            
            main_cursor.execute("SELECT COUNT(*) FROM foods")
            final_food_count = main_cursor.fetchone()[0]
            assert final_food_count == initial_food_count, "Main database food count should not change"
            
            main_cursor.execute("SELECT COUNT(*) FROM ratings")
            final_rating_count = main_cursor.fetchone()[0]
            assert final_rating_count == initial_rating_count, "Main database rating count should not change"
            
            main_conn.close()
        finally:
            # Clean up environment variable
            if "SKIP_DB_SAFETY_CHECK" in os.environ:
                del os.environ["SKIP_DB_SAFETY_CHECK"]
    
    def test_test_database_isolation(self):
        """Test that different test instances use isolated databases."""
        # Set environment variable to skip safety check for this test
        os.environ["SKIP_DB_SAFETY_CHECK"] = "1"
        
        try:
            # Create two test database instances
            test_db1 = TestDatabaseHelper()
            test_db2 = TestDatabaseHelper()
            
            try:
                test_db1.setup()
                test_db2.setup()
                
                # Add data to first test database
                cursor1 = test_db1.conn.cursor()
                cursor1.execute("INSERT INTO foods (name, station, dining_hall, meal) VALUES (?, ?, ?, ?)",
                              ("Test Food 1", "Test Station", "Test Hall", "test-meal"))
                test_db1.conn.commit()
                
                # Add data to second test database
                cursor2 = test_db2.conn.cursor()
                cursor2.execute("INSERT INTO foods (name, station, dining_hall, meal) VALUES (?, ?, ?, ?)",
                              ("Test Food 2", "Test Station", "Test Hall", "test-meal"))
                test_db2.conn.commit()
                
                # Verify isolation - each database should only have its own data
                cursor1.execute("SELECT COUNT(*) FROM foods WHERE name = 'Test Food 1'")
                count1 = cursor1.fetchone()[0]
                assert count1 == 1, "First test database should have Test Food 1"
                
                cursor1.execute("SELECT COUNT(*) FROM foods WHERE name = 'Test Food 2'")
                count2 = cursor1.fetchone()[0]
                assert count2 == 0, "First test database should not have Test Food 2"
                
                cursor2.execute("SELECT COUNT(*) FROM foods WHERE name = 'Test Food 2'")
                count2 = cursor2.fetchone()[0]
                assert count2 == 1, "Second test database should have Test Food 2"
                
                cursor2.execute("SELECT COUNT(*) FROM foods WHERE name = 'Test Food 1'")
                count1 = cursor2.fetchone()[0]
                assert count1 == 0, "Second test database should not have Test Food 1"
                
            finally:
                test_db1.teardown()
                test_db2.teardown()
        finally:
            # Clean up environment variable
            if "SKIP_DB_SAFETY_CHECK" in os.environ:
                del os.environ["SKIP_DB_SAFETY_CHECK"]
    
    def test_main_database_path_safety(self):
        """Test that we can't accidentally use the main database path."""
        main_db_path = os.path.join(
            os.path.dirname(__file__), "..", "ratemyrations", "ratings.db"
        )
        
        # This should raise an error
        with pytest.raises(ValueError, match="ERROR: Attempted to use main database in tests"):
            TestDatabaseHelper(db_path=main_db_path)
    
    def test_temporary_database_cleanup(self):
        """Test that temporary databases are properly cleaned up."""
        # Set environment variable to skip safety check for this test
        os.environ["SKIP_DB_SAFETY_CHECK"] = "1"
        
        try:
            test_db = TestDatabaseHelper()
            db_path = test_db.db_path
            
            # Verify temporary file exists
            assert os.path.exists(db_path), "Temporary database file should exist"
            
            test_db.setup()
            test_db.teardown()
            
            # Verify temporary file is cleaned up
            assert not os.path.exists(db_path), "Temporary database file should be cleaned up"
        finally:
            # Clean up environment variable
            if "SKIP_DB_SAFETY_CHECK" in os.environ:
                del os.environ["SKIP_DB_SAFETY_CHECK"]
