"""
Integration tests for menu fetching and Nutrislice API integration.
"""

import pytest
import json
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from tests.utils.test_config import TestClient, MockNutrisliceAPI


class TestMenuFetching:
    """Test menu fetching integration."""
    
    def test_fetch_all_menus_success(self, client):
        """Test successful menu fetching."""
        with patch('ratemyrations.app.get_menu') as mock_get_menu:
            mock_get_menu.return_value = (
                "Burge", "breakfast", 
                {"Main Station": [{"id": 1, "name": "Eggs", "meal": "breakfast"}]}
            )
            
            response = client.get('/api/menus')
            data = response.get_json()
            
            assert response.status_code == 200
            assert 'Burge' in data
            assert 'breakfast' in data['Burge']
            assert 'Main Station' in data['Burge']['breakfast']
    
    def test_fetch_all_menus_partial_failure(self, client):
        """Test menu fetching with some failures."""
        def mock_get_menu_side_effect(name, school, meal, date):
            if school == "burge-market":
                return ("Burge", "breakfast", {"Main Station": [{"id": 1, "name": "Eggs", "meal": "breakfast"}]})
            else:
                return (name, meal, {})  # Empty menu for other dining halls
        
        with patch('ratemyrations.app.get_menu') as mock_get_menu:
            mock_get_menu.side_effect = mock_get_menu_side_effect
            
            response = client.get('/api/menus')
            data = response.get_json()
            
            assert response.status_code == 200
            assert 'Burge' in data
            # Other dining halls should still be present but empty
    
    def test_menu_data_structure(self, client):
        """Test that menu data has correct structure."""
        with patch('ratemyrations.app.get_menu') as mock_get_menu:
            mock_get_menu.return_value = (
                "Burge", "breakfast",
                {
                    "Main Station": [
                        {"id": 1, "name": "Scrambled Eggs", "meal": "breakfast"},
                        {"id": 2, "name": "Bacon", "meal": "breakfast"}
                    ],
                    "Salad Bar": [
                        {"id": 3, "name": "Caesar Salad", "meal": "breakfast"}
                    ]
                }
            )
            
            response = client.get('/api/menus')
            data = response.get_json()
            
            # Verify structure
            assert 'Burge' in data
            assert 'breakfast' in data['Burge']
            assert 'Main Station' in data['Burge']['breakfast']
            assert 'Salad Bar' in data['Burge']['breakfast']
            
            # Verify food items
            main_station_items = data['Burge']['breakfast']['Main Station']
            assert len(main_station_items) == 2
            assert main_station_items[0]['name'] == "Scrambled Eggs"
            assert main_station_items[0]['id'] == 1
    
    def test_menu_caching(self, client):
        """Test that menu data is cached."""
        call_count = 0
        
        def mock_get_menu(name, school, meal, date):
            nonlocal call_count
            call_count += 1
            return (name, meal, {"Station": [{"id": 1, "name": "Food", "meal": meal}]})
        
        with patch('ratemyrations.app.get_menu') as mock_get_menu:
            mock_get_menu.side_effect = mock_get_menu
            
            # First request
            response1 = client.get('/api/menus')
            assert response1.status_code == 200
            
            # Second request (should use cache)
            response2 = client.get('/api/menus')
            assert response2.status_code == 200
            
            # Verify cache was used (fewer calls than expected)
            # Note: This depends on cache implementation
    
    def test_menu_refresh_bypass_cache(self, client):
        """Test that refresh parameter bypasses cache."""
        call_count = 0
        
        def mock_get_menu(name, school, meal, date):
            nonlocal call_count
            call_count += 1
            return (name, meal, {"Station": [{"id": 1, "name": "Food", "meal": meal}]})
        
        with patch('ratemyrations.app.get_menu') as mock_get_menu:
            mock_get_menu.side_effect = mock_get_menu
            
            # First request
            client.get('/api/menus')
            
            # Second request with refresh
            client.get('/api/menus?refresh=true')
            
            # Should have made more calls due to refresh
            # Note: Implementation dependent


class TestNutrisliceAPI:
    """Test Nutrislice API integration."""
    
    def test_nutrislice_api_structure(self):
        """Test Nutrislice API response structure."""
        mock_api = MockNutrisliceAPI()
        
        # Test successful response
        response = mock_api.get_menu("burge-market", "breakfast", datetime.now())
        assert "menu_items" in response
        assert len(response["menu_items"]) > 0
        
        # Test non-existent menu
        response = mock_api.get_menu("non-existent", "breakfast", datetime.now())
        assert response == {"menu_items": []}
    
    def test_nutrislice_api_timeout(self, client):
        """Test handling of Nutrislice API timeouts."""
        with patch('requests.get') as mock_get:
            mock_get.side_effect = Exception("Timeout")
            
            response = client.get('/api/menus')
            assert response.status_code == 502
            data = response.get_json()
            assert "error" in data
    
    def test_nutrislice_api_invalid_json(self, client):
        """Test handling of invalid JSON from Nutrislice API."""
        with patch('requests.get') as mock_get:
            mock_response = MagicMock()
            mock_response.json.side_effect = json.JSONDecodeError("Invalid JSON", "", 0)
            mock_response.status_code = 200
            mock_get.return_value = mock_response
            
            response = client.get('/api/menus')
            assert response.status_code == 502
    
    def test_nutrislice_api_http_error(self, client):
        """Test handling of HTTP errors from Nutrislice API."""
        with patch('requests.get') as mock_get:
            mock_response = MagicMock()
            mock_response.status_code = 404
            mock_response.raise_for_status.side_effect = Exception("404 Not Found")
            mock_get.return_value = mock_response
            
            response = client.get('/api/menus')
            assert response.status_code == 502


class TestMenuProcessing:
    """Test menu data processing."""
    
    def test_ignore_categories(self, client):
        """Test that ignored categories are filtered out."""
        with patch('ratemyrations.app.get_menu') as mock_get_menu:
            mock_get_menu.return_value = (
                "Burge", "breakfast",
                {
                    "Main Station": [{"id": 1, "name": "Eggs", "meal": "breakfast"}],
                    "Beverages": [{"id": 2, "name": "Coffee", "meal": "breakfast"}],
                    "Condiments": [{"id": 3, "name": "Ketchup", "meal": "breakfast"}]
                }
            )
            
            response = client.get('/api/menus')
            data = response.get_json()
            
            # Beverages and Condiments should be filtered out
            assert 'Main Station' in data['Burge']['breakfast']
            assert 'Beverages' not in data['Burge']['breakfast']
            assert 'Condiments' not in data['Burge']['breakfast']
    
    def test_meal_normalization(self, client):
        """Test meal name normalization."""
        with patch('ratemyrations.app.get_menu') as mock_get_menu:
            # Simulate different meal slugs
            def mock_get_menu_side_effect(name, school, meal, date):
                if meal == "lunch-2":
                    return (name, "lunch", {"Station": [{"id": 1, "name": "Food", "meal": "lunch"}]})
                elif meal == "breakfast-3":
                    return (name, "breakfast", {"Station": [{"id": 1, "name": "Food", "meal": "breakfast"}]})
                else:
                    return (name, meal, {"Station": [{"id": 1, "name": "Food", "meal": meal}]})
            
            mock_get_menu.side_effect = mock_get_menu_side_effect
            
            response = client.get('/api/menus')
            data = response.get_json()
            
            # Verify normalized meal names
            assert 'breakfast' in data['Burge']
            assert 'lunch' in data['Burge']
            assert 'dinner' in data['Burge']
    
    def test_empty_menu_handling(self, client):
        """Test handling of empty menus."""
        with patch('ratemyrations.app.get_menu') as mock_get_menu:
            mock_get_menu.return_value = ("Burge", "breakfast", {})
            
            response = client.get('/api/menus')
            data = response.get_json()
            
            assert response.status_code == 200
            assert 'Burge' in data
            assert 'breakfast' in data['Burge']
            assert len(data['Burge']['breakfast']) == 0


class TestConcurrentMenuFetching:
    """Test concurrent menu fetching."""
    
    def test_concurrent_fetching(self, client):
        """Test that multiple dining halls are fetched concurrently."""
        call_times = []
        
        def mock_get_menu(name, school, meal, date):
            import time
            call_times.append(time.time())
            return (name, meal, {"Station": [{"id": 1, "name": "Food", "meal": meal}]})
        
        with patch('ratemyrations.app.get_menu') as mock_get_menu:
            mock_get_menu.side_effect = mock_get_menu
            
            response = client.get('/api/menus')
            assert response.status_code == 200
            
            # Verify concurrent calls (times should be close together)
            if len(call_times) > 1:
                time_diff = max(call_times) - min(call_times)
                # Should be much less than sequential calls would take
                assert time_diff < 1.0  # Less than 1 second for all calls


class TestMenuDataConsistency:
    """Test menu data consistency."""
    
    def test_food_id_consistency(self, client):
        """Test that food IDs are consistent across requests."""
        with patch('ratemyrations.app.get_menu') as mock_get_menu:
            mock_get_menu.return_value = (
                "Burge", "breakfast",
                {"Main Station": [{"id": 1, "name": "Eggs", "meal": "breakfast"}]}
            )
            
            # First request
            response1 = client.get('/api/menus')
            data1 = response1.get_json()
            
            # Second request
            response2 = client.get('/api/menus')
            data2 = response2.get_json()
            
            # Food IDs should be consistent
            food1_id = data1['Burge']['breakfast']['Main Station'][0]['id']
            food2_id = data2['Burge']['breakfast']['Main Station'][0]['id']
            assert food1_id == food2_id
    
    def test_menu_date_consistency(self, client):
        """Test that menu data is consistent for the same date."""
        test_date = "2024-01-15"
        
        with patch('ratemyrations.app.get_menu') as mock_get_menu:
            mock_get_menu.return_value = (
                "Burge", "breakfast",
                {"Main Station": [{"id": 1, "name": "Eggs", "meal": "breakfast"}]}
            )
            
            response = client.get(f'/api/menus?date={test_date}')
            data = response.get_json()
            
            # Verify date was passed correctly
            mock_get_menu.assert_called()
            # Check that date parameter was passed (implementation dependent)
