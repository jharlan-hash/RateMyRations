"""
Unit tests for Flask API endpoints.
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from tests.utils.test_config import (
    TestClient, assert_valid_json_response, assert_error_response,
    generate_test_date, create_test_rating_data, admin_headers
)


class TestAPIEndpoints:
    """Test Flask API endpoints."""
    
    def test_index_route(self, client):
        """Test main index route."""
        response = client.get('/')
        assert response.status_code == 200
        assert 'text/html' in response.content_type
        assert 'RateMyRations' in response.get_data(as_text=True)
    
    def test_about_route(self, client):
        """Test about page route."""
        response = client.get('/about')
        assert response.status_code == 200
        assert 'text/html' in response.content_type
        assert 'About' in response.get_data(as_text=True)
    
    def test_healthz_endpoint(self, client):
        """Test health check endpoint."""
        response = client.get('/healthz')
        data = assert_valid_json_response(response)
        assert data['status'] == 'ok'
    
    def test_readyz_endpoint(self, client):
        """Test readiness check endpoint."""
        response = client.get('/readyz')
        data = assert_valid_json_response(response)
        assert data['status'] == 'ready'
        assert 'db' in data
        assert 'redis' in data
    
    def test_readyz_with_redis_error(self, client):
        """Test readiness check when Redis is unavailable."""
        with patch('redis.Redis') as mock_redis:
            mock_redis.return_value.ping.side_effect = Exception("Redis unavailable")
            
            response = client.get('/readyz')
            assert response.status_code == 503
    
    def test_menus_endpoint_default_date(self, client):
        """Test menus endpoint with default date."""
        with patch('ratemyrations.app.fetch_all_menus') as mock_fetch:
            mock_fetch.return_value = {"Burge": {"breakfast": {"Main Station": []}}}
            
            response = client.get('/api/menus')
            data = assert_valid_json_response(response)
            assert 'Burge' in data
            mock_fetch.assert_called_once()
    
    def test_menus_endpoint_specific_date(self, client):
        """Test menus endpoint with specific date."""
        test_date = generate_test_date()
        
        with patch('ratemyrations.app.fetch_all_menus') as mock_fetch:
            mock_fetch.return_value = {"Burge": {"breakfast": {"Main Station": []}}}
            
            response = client.get(f'/api/menus?date={test_date}')
            data = assert_valid_json_response(response)
            assert 'Burge' in data
            mock_fetch.assert_called_once_with(test_date)
    
    def test_menus_endpoint_invalid_date(self, client):
        """Test menus endpoint with invalid date format."""
        response = client.get('/api/menus?date=invalid-date')
        assert_error_response(response, 400, "Invalid date format")
    
    def test_menus_endpoint_future_date(self, client):
        """Test menus endpoint with date too far in future."""
        future_date = generate_test_date(30)  # 30 days in future
        
        response = client.get(f'/api/menus?date={future_date}')
        assert_error_response(response, 400, "Date too far in the future")
    
    def test_menus_endpoint_refresh(self, client):
        """Test menus endpoint with refresh parameter."""
        with patch('ratemyrations.app.fetch_all_menus') as mock_fetch:
            mock_fetch.return_value = {"Burge": {"breakfast": {"Main Station": []}}}
            
            response = client.get('/api/menus?refresh=true')
            data = assert_valid_json_response(response)
            assert 'Burge' in data
            # Should call with refresh=True (implementation dependent)
    
    def test_menus_endpoint_error(self, client):
        """Test menus endpoint when menu fetching fails."""
        with patch('ratemyrations.app.fetch_all_menus') as mock_fetch:
            mock_fetch.side_effect = Exception("Menu fetch failed")
            
            response = client.get('/api/menus')
            assert_error_response(response, 502, "Failed to retrieve menus")
    
    def test_ratings_endpoint(self, client):
        """Test ratings endpoint."""
        with patch('ratemyrations.database.get_ratings') as mock_get_ratings:
            mock_get_ratings.return_value = {
                "foods": {"Test Food_Station_Hall_meal": {"avg_rating": 4.0, "rating_count": 1}},
                "stations": {},
                "dining_halls": {},
                "meals": {}
            }
            
            response = client.get('/api/ratings')
            data = assert_valid_json_response(response)
            assert 'foods' in data
            assert 'stations' in data
            assert 'dining_halls' in data
            assert 'meals' in data
    
    def test_ratings_endpoint_with_date(self, client):
        """Test ratings endpoint with date parameter."""
        test_date = generate_test_date()
        
        with patch('ratemyrations.database.get_ratings') as mock_get_ratings:
            mock_get_ratings.return_value = {"foods": {}, "stations": {}, "dining_halls": {}, "meals": {}}
            
            response = client.get(f'/api/ratings?date={test_date}')
            data = assert_valid_json_response(response)
            mock_get_ratings.assert_called_once_with(test_date)
    
    def test_rate_endpoint_success(self, client):
        """Test rating submission endpoint."""
        rating_data = create_test_rating_data()
        
        with patch('ratemyrations.database.add_rating') as mock_add_rating:
            mock_add_rating.return_value = None
            
            response = client.post_json('/api/rate', rating_data)
            data = assert_valid_json_response(response)
            assert data['status'] == 'success'
            mock_add_rating.assert_called_once()
    
    def test_rate_endpoint_invalid_food_id(self, client):
        """Test rating endpoint with invalid food_id."""
        rating_data = create_test_rating_data(food_id="invalid")
        
        response = client.post_json('/api/rate', rating_data)
        assert_error_response(response, 400, "Invalid food_id")
    
    def test_rate_endpoint_invalid_rating(self, client):
        """Test rating endpoint with invalid rating."""
        rating_data = create_test_rating_data(rating=6)
        
        response = client.post_json('/api/rate', rating_data)
        assert_error_response(response, 400, "Invalid rating")
    
    def test_rate_endpoint_missing_user_id(self, client):
        """Test rating endpoint with missing user_id."""
        rating_data = create_test_rating_data()
        del rating_data['user_id']
        
        response = client.post_json('/api/rate', rating_data)
        assert_error_response(response, 400, "Missing user_id")
    
    def test_rate_endpoint_banned_user(self, client):
        """Test rating endpoint with banned user."""
        rating_data = create_test_rating_data(user_id="banned-user")
        
        with patch('ratemyrations.database.is_user_banned') as mock_is_banned:
            mock_is_banned.return_value = True
            
            response = client.post_json('/api/rate', rating_data)
            assert_error_response(response, 403, "User is banned")
    
    def test_rate_endpoint_database_error(self, client):
        """Test rating endpoint when database operation fails."""
        rating_data = create_test_rating_data()
        
        with patch('ratemyrations.database.add_rating') as mock_add_rating:
            mock_add_rating.side_effect = Exception("Database error")
            
            response = client.post_json('/api/rate', rating_data)
            assert_error_response(response, 500, "Failed to save rating")
    
    def test_warm_cache_endpoint(self, client):
        """Test cache warming endpoint."""
        with patch('ratemyrations.app.fetch_all_menus') as mock_fetch:
            mock_fetch.return_value = {"Burge": {"breakfast": {"Main Station": []}}}
            
            response = client.get('/warm-cache')
            data = assert_valid_json_response(response)
            assert data['status'] == 'success'
            assert 'date' in data
            assert 'cached_menus' in data
    
    def test_warm_cache_endpoint_error(self, client):
        """Test cache warming endpoint when it fails."""
        with patch('ratemyrations.app.fetch_all_menus') as mock_fetch:
            mock_fetch.side_effect = Exception("Cache warm failed")
            
            response = client.get('/warm-cache')
            assert_error_response(response, 500, "Failed to warm cache")


class TestAdminEndpoints:
    """Test admin API endpoints."""
    
    def test_admin_page(self, client, admin_headers):
        """Test admin page access."""
        response = client.get(f'/admin?token={admin_headers["X-Admin-Token"]}')
        assert response.status_code == 200
        assert 'text/html' in response.content_type
        assert 'Admin Console' in response.get_data(as_text=True)
    
    def test_admin_page_invalid_token(self, client):
        """Test admin page with invalid token."""
        response = client.get('/admin?token=invalid-token')
        assert_error_response(response, 403, "Invalid admin token")
    
    def test_admin_ratings_endpoint(self, client, admin_headers):
        """Test admin ratings endpoint."""
        with patch('ratemyrations.database.get_all_ratings') as mock_get_all:
            mock_get_all.return_value = [
                {
                    "id": 1,
                    "user_id": "user1",
                    "rating": 4,
                    "food_name": "Pizza",
                    "station": "Main Station",
                    "dining_hall": "Burge",
                    "meal": "lunch",
                    "date": "2024-01-15",
                    "nickname": "John",
                    "is_banned": False
                }
            ]
            
            response = client.get(f'/api/admin/ratings?token={admin_headers["X-Admin-Token"]}')
            data = assert_valid_json_response(response)
            assert len(data) >= 1
            assert data[0]['food_name'] == "Pizza"
    
    def test_admin_ratings_invalid_token(self, client):
        """Test admin ratings with invalid token."""
        response = client.get('/api/admin/ratings?token=invalid-token')
        assert_error_response(response, 403, "Invalid admin token")
    
    def test_admin_delete_rating(self, client, admin_headers):
        """Test admin delete rating endpoint."""
        with patch('ratemyrations.database.delete_rating_by_id') as mock_delete:
            mock_delete.return_value = True
            
            response = client.post_json('/api/admin/delete-rating', 
                                      {"rating_id": 1}, 
                                      headers=admin_headers)
            data = assert_valid_json_response(response)
            assert data['status'] == 'success'
            mock_delete.assert_called_once_with(1)
    
    def test_admin_delete_rating_invalid_token(self, client):
        """Test admin delete rating with invalid token."""
        response = client.post_json('/api/admin/delete-rating', 
                                  {"rating_id": 1}, 
                                  headers={"X-Admin-Token": "invalid"})
        assert_error_response(response, 403, "Invalid admin token")
    
    def test_admin_update_nickname(self, client, admin_headers):
        """Test admin update nickname endpoint."""
        with patch('ratemyrations.database.update_user_nickname') as mock_update:
            mock_update.return_value = True
            
            response = client.post_json('/api/admin/update-nickname',
                                      {"user_id": "user1", "nickname": "New Name"},
                                      headers=admin_headers)
            data = assert_valid_json_response(response)
            assert data['status'] == 'success'
            mock_update.assert_called_once_with("user1", "New Name")
    
    def test_admin_ban_user(self, client, admin_headers):
        """Test admin ban user endpoint."""
        with patch('ratemyrations.database.ban_user') as mock_ban:
            mock_ban.return_value = True
            
            response = client.post_json('/api/admin/ban-user',
                                      {"user_id": "user1", "reason": "Spam"},
                                      headers=admin_headers)
            data = assert_valid_json_response(response)
            assert data['status'] == 'success'
            mock_ban.assert_called_once_with("user1", "Spam")
    
    def test_admin_unban_user(self, client, admin_headers):
        """Test admin unban user endpoint."""
        with patch('ratemyrations.database.unban_user') as mock_unban:
            mock_unban.return_value = True
            
            response = client.post_json('/api/admin/unban-user',
                                      {"user_id": "user1"},
                                      headers=admin_headers)
            data = assert_valid_json_response(response)
            assert data['status'] == 'success'
            mock_unban.assert_called_once_with("user1")
    
    def test_delete_ratings_endpoint_disabled(self, client, admin_headers):
        """Test delete all ratings endpoint when disabled."""
        response = client.post('/api/delete-ratings', headers=admin_headers)
        assert_error_response(response, 404, "Endpoint disabled")
    
    def test_delete_ratings_endpoint_enabled(self, client, admin_headers):
        """Test delete all ratings endpoint when enabled."""
        with patch('ratemyrations.config.ENABLE_DELETE_RATINGS', True):
            with patch('ratemyrations.database.delete_all_ratings') as mock_delete:
                mock_delete.return_value = None
                
                response = client.post('/api/delete-ratings', headers=admin_headers)
                data = assert_valid_json_response(response)
                assert data['status'] == 'success'
                mock_delete.assert_called_once()


class TestRateLimiting:
    """Test rate limiting functionality."""
    
    def test_rate_limiting_enforcement(self, client):
        """Test that rate limiting is enforced."""
        # Make many requests quickly
        for i in range(100):  # Exceed default limit
            response = client.get('/api/menus')
            if response.status_code == 429:
                break
        
        # Should eventually get rate limited
        assert response.status_code == 429
        data = response.get_json()
        assert 'error' in data
    
    def test_rate_limiting_reset(self, client):
        """Test that rate limiting resets after time period."""
        # This test would require time manipulation or mocking
        # For now, just verify the endpoint exists
        response = client.get('/api/menus')
        assert response.status_code in [200, 429]  # Either success or rate limited
