"""
pytest configuration and test runner for RateMyRations.
"""

import pytest
import os
import sys
import tempfile
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

# Import test utilities
from tests.utils.test_config import (
    TestDatabaseHelper, TestClient, MockNutrisliceAPI, create_test_app,
    TEST_ADMIN_TOKEN, SAMPLE_MENU_DATA, SAMPLE_FOOD_ITEMS, SAMPLE_RATINGS
)

# Test configuration
TEST_DB_PATH = ":memory:"
TEST_ADMIN_TOKEN = "test-admin-token-12345"

# Ensure we never use the main database in tests
MAIN_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "ratemyrations", "ratings.db")

# Set test environment variables
os.environ["ADMIN_TOKEN"] = TEST_ADMIN_TOKEN
os.environ["RATE_LIMIT_DEFAULT"] = "1000 per minute"  # High limit for testing
os.environ["CACHE_MINUTES"] = "1"  # Short cache for testing
os.environ["ENABLE_DELETE_RATINGS"] = "true"  # Enable for testing

# Add safety check to ensure main database is not used in tests
def pytest_sessionstart(session):
    """Ensure main database is not used during tests."""
    import ratemyrations.database
    if ratemyrations.database.DB_FILE == MAIN_DB_PATH:
        pytest.exit("ERROR: Tests are configured to use the main database! This is dangerous.")


def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line(
        "markers", "unit: mark test as a unit test"
    )
    config.addinivalue_line(
        "markers", "integration: mark test as an integration test"
    )
    config.addinivalue_line(
        "markers", "e2e: mark test as an end-to-end test"
    )
    config.addinivalue_line(
        "markers", "performance: mark test as a performance test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )


def pytest_collection_modifyitems(config, items):
    """Modify test collection."""
    # Add markers based on file location
    for item in items:
        if "unit" in str(item.fspath):
            item.add_marker(pytest.mark.unit)
        elif "integration" in str(item.fspath):
            item.add_marker(pytest.mark.integration)
        elif "e2e" in str(item.fspath):
            item.add_marker(pytest.mark.e2e)
        elif "performance" in str(item.fspath):
            item.add_marker(pytest.mark.performance)
        
        # Mark slow tests
        if "performance" in str(item.fspath) or "load" in item.name.lower():
            item.add_marker(pytest.mark.slow)


@pytest.fixture(autouse=True)
def clear_cache():
    """Clear the cache before each test."""
    from collections import OrderedDict
    from ratemyrations.app import CACHE
    CACHE.clear()
    yield
    CACHE.clear()


@pytest.fixture(scope="session")
def test_session():
    """Session-level test setup."""
    # Create temporary directory for test files
    temp_dir = tempfile.mkdtemp(prefix="ratemyrations_test_")
    
    yield temp_dir
    
    # Cleanup
    import shutil
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture(scope="function")
def test_db_path():
    """Provide test database path."""
    return TEST_DB_PATH


@pytest.fixture(scope="function")
def test_admin_token():
    """Provide test admin token."""
    return TEST_ADMIN_TOKEN


@pytest.fixture
def test_db():
    """Provide test database instance."""
    db = TestDatabaseHelper()
    # Set environment variable to skip safety check for database tests
    os.environ["SKIP_DB_SAFETY_CHECK"] = "1"
    try:
        db.setup()
        yield db
    finally:
        db.teardown()
        # Clean up environment variable
        if "SKIP_DB_SAFETY_CHECK" in os.environ:
            del os.environ["SKIP_DB_SAFETY_CHECK"]


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


# Test discovery patterns
collect_ignore = [
    "setup.py",
    "conftest.py"
]

# Test output configuration
# Note: HTML report customization requires pytest-html plugin


# Performance test configuration
@pytest.fixture(scope="session")
def performance_config():
    """Performance test configuration."""
    return {
        "max_response_time": 2.0,
        "max_concurrent_users": 100,
        "test_duration": 60,  # seconds
        "ramp_up_time": 10,   # seconds
    }


# Integration test configuration
@pytest.fixture(scope="session")
def integration_config():
    """Integration test configuration."""
    return {
        "test_timeout": 30,
        "retry_count": 3,
        "mock_external_apis": True,
    }


# E2E test configuration
@pytest.fixture(scope="session")
def e2e_config():
    """E2E test configuration."""
    return {
        "browser": "chrome",
        "headless": True,
        "implicit_wait": 10,
        "page_load_timeout": 30,
    }
