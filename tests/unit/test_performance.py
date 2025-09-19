"""
Performance and load tests for RateMyRations.
"""

import pytest
import time
import threading
import requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from tests.utils.test_config import TestClient, generate_test_date


class TestPerformance:
    """Test application performance."""
    
    def test_api_response_times(self, client):
        """Test API response times."""
        endpoints = [
            '/healthz',
            '/readyz',
            '/api/menus',
            '/api/ratings',
            '/warm-cache'
        ]
        
        for endpoint in endpoints:
            start_time = time.time()
            response = client.get(endpoint)
            response_time = time.time() - start_time
            
            # All endpoints should respond within reasonable time
            assert response_time < 2.0, f"{endpoint} took {response_time:.2f}s"
            assert response.status_code in [200, 429], f"{endpoint} returned {response.status_code}"
    
    def test_menu_fetching_performance(self, client):
        """Test menu fetching performance."""
        # Test with different dates
        dates = [
            generate_test_date(0),   # Today
            generate_test_date(1),   # Tomorrow
            generate_test_date(7),  # Next week
        ]
        
        for date in dates:
            start_time = time.time()
            response = client.get(f'/api/menus?date={date}')
            response_time = time.time() - start_time
            
            assert response.status_code == 200
            assert response_time < 3.0, f"Menu fetch for {date} took {response_time:.2f}s"
    
    def test_rating_submission_performance(self, client):
        """Test rating submission performance."""
        rating_data = {
            "food_id": 1,
            "user_id": "perf-test-user",
            "rating": 4
        }
        
        start_time = time.time()
        response = client.post_json('/api/rate', rating_data)
        response_time = time.time() - start_time
        
        assert response.status_code in [200, 429]  # Success or rate limited
        assert response_time < 1.0, f"Rating submission took {response_time:.2f}s"


class TestLoadTesting:
    """Test application under load."""
    
    def test_concurrent_menu_requests(self, client):
        """Test concurrent menu requests."""
        def make_request():
            response = client.get('/api/menus')
            return response.status_code
        
        # Make 10 concurrent requests
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(make_request) for _ in range(10)]
            results = [future.result() for future in as_completed(futures)]
        
        # Most requests should succeed (some may be rate limited)
        success_count = sum(1 for status in results if status == 200)
        assert success_count >= 5, f"Only {success_count}/10 requests succeeded"
    
    def test_concurrent_rating_submissions(self, client):
        """Test concurrent rating submissions."""
        def make_rating_request(user_id):
            rating_data = {
                "food_id": 1,
                "user_id": f"load-test-user-{user_id}",
                "rating": 4
            }
            response = client.post_json('/api/rate', rating_data)
            return response.status_code
        
        # Make 20 concurrent rating requests
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(make_rating_request, i) for i in range(20)]
            results = [future.result() for future in as_completed(futures)]
        
        # Some should succeed, some may be rate limited
        success_count = sum(1 for status in results if status == 200)
        rate_limited_count = sum(1 for status in results if status == 429)
        
        assert success_count > 0, "No rating requests succeeded"
        assert success_count + rate_limited_count == 20, "Some requests failed unexpectedly"
    
    def test_mixed_load(self, client):
        """Test mixed load of different operations."""
        def menu_request():
            response = client.get('/api/menus')
            return ('menu', response.status_code)
        
        def rating_request(user_id):
            rating_data = {
                "food_id": 1,
                "user_id": f"mixed-test-user-{user_id}",
                "rating": 4
            }
            response = client.post_json('/api/rate', rating_data)
            return ('rating', response.status_code)
        
        def health_check():
            response = client.get('/healthz')
            return ('health', response.status_code)
        
        # Mix of different operations
        operations = []
        operations.extend([menu_request for _ in range(5)])
        operations.extend([lambda: rating_request(i) for i in range(5)])
        operations.extend([health_check for _ in range(5)])
        
        with ThreadPoolExecutor(max_workers=15) as executor:
            futures = [executor.submit(op) for op in operations]
            results = [future.result() for future in as_completed(futures)]
        
        # Categorize results
        menu_results = [r for r in results if r[0] == 'menu']
        rating_results = [r for r in results if r[0] == 'rating']
        health_results = [r for r in results if r[0] == 'health']
        
        # All health checks should succeed
        assert all(status == 200 for _, status in health_results)
        
        # Most menu requests should succeed
        menu_success = sum(1 for _, status in menu_results if status == 200)
        assert menu_success >= 3, f"Only {menu_success}/5 menu requests succeeded"
        
        # Some rating requests should succeed
        rating_success = sum(1 for _, status in rating_results if status == 200)
        assert rating_success > 0, "No rating requests succeeded"


class TestStressTesting:
    """Test application under stress conditions."""
    
    def test_rapid_successive_requests(self, client):
        """Test rapid successive requests."""
        # Make requests as fast as possible
        start_time = time.time()
        responses = []
        
        for i in range(50):
            response = client.get('/api/menus')
            responses.append(response.status_code)
        
        total_time = time.time() - start_time
        
        # Should handle rapid requests gracefully
        success_count = sum(1 for status in responses if status == 200)
        rate_limited_count = sum(1 for status in responses if status == 429)
        
        assert success_count + rate_limited_count == 50, "Some requests failed unexpectedly"
        assert total_time < 10.0, f"50 requests took {total_time:.2f}s"
    
    def test_large_rating_batch(self, client):
        """Test large batch of ratings."""
        def submit_rating(user_id):
            rating_data = {
                "food_id": 1,
                "user_id": f"stress-test-user-{user_id}",
                "rating": 4
            }
            response = client.post_json('/api/rate', rating_data)
            return response.status_code
        
        # Submit 100 ratings
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(submit_rating, i) for i in range(100)]
            results = [future.result() for future in as_completed(futures)]
        
        # Should handle large batch gracefully
        success_count = sum(1 for status in results if status == 200)
        rate_limited_count = sum(1 for status in results if status == 429)
        
        assert success_count > 0, "No ratings succeeded"
        assert success_count + rate_limited_count == 100, "Some requests failed unexpectedly"


class TestMemoryUsage:
    """Test memory usage patterns."""
    
    def test_memory_leak_detection(self, client):
        """Test for memory leaks in repeated operations."""
        # This would require memory monitoring tools
        # For now, just test that repeated operations don't fail
        
        for i in range(10):
            # Repeated menu requests
            response = client.get('/api/menus')
            assert response.status_code in [200, 429]
            
            # Repeated rating submissions
            rating_data = {
                "food_id": 1,
                "user_id": f"memory-test-user-{i}",
                "rating": 4
            }
            response = client.post_json('/api/rate', rating_data)
            assert response.status_code in [200, 429]
    
    def test_cache_memory_usage(self, client):
        """Test cache memory usage."""
        # Test cache warming
        response = client.get('/warm-cache')
        assert response.status_code == 200
        
        # Make multiple requests to test cache
        for i in range(5):
            response = client.get('/api/menus')
            assert response.status_code in [200, 429]


class TestDatabasePerformance:
    """Test database performance under load."""
    
    def test_concurrent_database_operations(self, client):
        """Test concurrent database operations."""
        def database_operation(user_id):
            # Mix of reads and writes
            rating_data = {
                "food_id": 1,
                "user_id": f"db-test-user-{user_id}",
                "rating": 4
            }
            
            # Write operation
            write_response = client.post_json('/api/rate', rating_data)
            
            # Read operation
            read_response = client.get('/api/ratings')
            
            return write_response.status_code, read_response.status_code
        
        # Concurrent database operations
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(database_operation, i) for i in range(10)]
            results = [future.result() for future in as_completed(futures)]
        
        # All operations should complete without database errors
        for write_status, read_status in results:
            assert write_status in [200, 429], f"Write failed with status {write_status}"
            assert read_status in [200, 429], f"Read failed with status {read_status}"
    
    def test_database_lock_handling(self, client):
        """Test database lock handling."""
        # This tests the retry logic for database locks
        def concurrent_rating(user_id):
            rating_data = {
                "food_id": 1,
                "user_id": f"lock-test-user-{user_id}",
                "rating": 4
            }
            response = client.post_json('/api/rate', rating_data)
            return response.status_code
        
        # Many concurrent writes to test lock handling
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = [executor.submit(concurrent_rating, i) for i in range(20)]
            results = [future.result() for future in as_completed(futures)]
        
        # Should handle locks gracefully
        success_count = sum(1 for status in results if status == 200)
        assert success_count > 0, "No operations succeeded despite retry logic"
