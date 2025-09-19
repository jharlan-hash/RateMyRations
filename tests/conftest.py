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

# Test configuration
TEST_DB_PATH = ":memory:"
TEST_ADMIN_TOKEN = "test-admin-token-12345"

# Set test environment variables
os.environ["ADMIN_TOKEN"] = TEST_ADMIN_TOKEN
os.environ["RATE_LIMIT_DEFAULT"] = "1000 per minute"  # High limit for testing
os.environ["CACHE_MINUTES"] = "1"  # Short cache for testing
os.environ["ENABLE_DELETE_RATINGS"] = "true"  # Enable for testing


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


# Test discovery patterns
collect_ignore = [
    "setup.py",
    "conftest.py"
]

# Test output configuration
def pytest_html_report_title(report):
    """Set HTML report title."""
    report.title = "RateMyRations Test Report"


def pytest_html_results_table_header(cells):
    """Customize HTML report table header."""
    cells.insert(1, html.th('Description'))
    cells.pop()


def pytest_html_results_table_row(report, cells):
    """Customize HTML report table rows."""
    cells.insert(1, html.td(report.description))
    cells.pop()


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
