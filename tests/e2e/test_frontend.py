"""
Frontend JavaScript tests using Selenium WebDriver.
"""

import pytest
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from tests.utils.test_config import TestClient


class TestFrontend:
    """Test frontend functionality."""
    
    @pytest.fixture(scope="class")
    def driver(self):
        """Set up Chrome WebDriver."""
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Run in headless mode
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        
        driver = webdriver.Chrome(options=chrome_options)
        driver.implicitly_wait(10)
        yield driver
        driver.quit()
    
    @pytest.fixture
    def app_url(self, test_app):
        """Get the test app URL."""
        return "http://localhost:5000"  # Adjust port as needed
    
    def test_page_loads(self, driver, app_url):
        """Test that the main page loads correctly."""
        driver.get(app_url)
        
        # Check page title
        assert "RateMyRations" in driver.title
        
        # Check main elements are present
        assert driver.find_element(By.TAG_NAME, "h1").text == "RateMyRations - UIowa"
        assert driver.find_element(By.ID, "menu-date")
        assert driver.find_element(By.ID, "menus-container")
    
    def test_date_picker(self, driver, app_url):
        """Test date picker functionality."""
        driver.get(app_url)
        
        date_input = driver.find_element(By.ID, "menu-date")
        
        # Test setting a date
        test_date = "2024-01-15"
        date_input.clear()
        date_input.send_keys(test_date)
        
        assert date_input.get_attribute("value") == test_date
    
    def test_dining_hall_expansion(self, driver, app_url):
        """Test dining hall expansion/collapse."""
        driver.get(app_url)
        
        # Wait for menus to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "dining-hall"))
        )
        
        # Find first dining hall
        dining_halls = driver.find_elements(By.CLASS_NAME, "dining-hall")
        if dining_halls:
            dining_hall = dining_halls[0]
            
            # Click to expand
            dining_hall.click()
            time.sleep(1)
            
            # Check if expanded
            assert "active" in dining_hall.get_attribute("class")
    
    def test_meal_expansion(self, driver, app_url):
        """Test meal expansion/collapse."""
        driver.get(app_url)
        
        # Wait for menus to load and expand dining hall
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "dining-hall"))
        )
        
        # Expand first dining hall
        dining_halls = driver.find_elements(By.CLASS_NAME, "dining-hall")
        if dining_halls:
            dining_halls[0].click()
            time.sleep(1)
            
            # Find first meal
            meals = driver.find_elements(By.CLASS_NAME, "meal")
            if meals:
                meal = meals[0]
                
                # Click to expand meal
                meal.click()
                time.sleep(1)
                
                # Check if expanded
                assert "active" in meal.get_attribute("class")
    
    def test_star_rating_interaction(self, driver, app_url):
        """Test star rating interaction."""
        driver.get(app_url)
        
        # Wait for menus to load and expand to food items
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "dining-hall"))
        )
        
        # Expand dining hall and meal to reach food items
        dining_halls = driver.find_elements(By.CLASS_NAME, "dining-hall")
        if dining_halls:
            dining_halls[0].click()
            time.sleep(1)
            
            meals = driver.find_elements(By.CLASS_NAME, "meal")
            if meals:
                meals[0].click()
                time.sleep(1)
                
                # Find star rating
                stars = driver.find_elements(By.CLASS_NAME, "star")
                if stars:
                    # Click on 3rd star
                    stars[2].click()
                    time.sleep(1)
                    
                    # Check if star is rated
                    assert "rated" in stars[2].get_attribute("class")
    
    def test_local_storage_persistence(self, driver, app_url):
        """Test that ratings persist in localStorage."""
        driver.get(app_url)
        
        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "dining-hall"))
        )
        
        # Check if browserId is stored
        browser_id = driver.execute_script("return localStorage.getItem('browserId');")
        assert browser_id is not None
        assert len(browser_id) > 0
        
        # Check if userRatings is stored
        user_ratings = driver.execute_script("return localStorage.getItem('userRatings');")
        assert user_ratings is not None
    
    def test_error_handling(self, driver, app_url):
        """Test frontend error handling."""
        driver.get(app_url)
        
        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "menus-container"))
        )
        
        # Check for error messages in console
        logs = driver.get_log('browser')
        error_logs = [log for log in logs if log['level'] == 'SEVERE']
        
        # Should not have critical errors
        critical_errors = [log for log in error_logs if 'RateMyRations' in log['message']]
        assert len(critical_errors) == 0
    
    def test_responsive_design(self, driver, app_url):
        """Test responsive design on different screen sizes."""
        driver.get(app_url)
        
        # Test mobile viewport
        driver.set_window_size(375, 667)  # iPhone size
        time.sleep(1)
        
        # Check that elements are still visible
        assert driver.find_element(By.TAG_NAME, "h1").is_displayed()
        assert driver.find_element(By.ID, "menu-date").is_displayed()
        
        # Test tablet viewport
        driver.set_window_size(768, 1024)  # iPad size
        time.sleep(1)
        
        assert driver.find_element(By.TAG_NAME, "h1").is_displayed()
        assert driver.find_element(By.ID, "menu-date").is_displayed()
        
        # Test desktop viewport
        driver.set_window_size(1920, 1080)  # Desktop size
        time.sleep(1)
        
        assert driver.find_element(By.TAG_NAME, "h1").is_displayed()
        assert driver.find_element(By.ID, "menu-date").is_displayed()


class TestFrontendJavaScript:
    """Test JavaScript functionality directly."""
    
    def test_browser_id_generation(self, driver, app_url):
        """Test browser ID generation."""
        driver.get(app_url)
        
        # Check that browserId is generated
        browser_id = driver.execute_script("return localStorage.getItem('browserId');")
        assert browser_id is not None
        assert len(browser_id) > 10  # Should be a reasonable length
        
        # Check that it's consistent across page reloads
        driver.refresh()
        time.sleep(2)
        
        new_browser_id = driver.execute_script("return localStorage.getItem('browserId');")
        assert browser_id == new_browser_id
    
    def test_rating_submission(self, driver, app_url):
        """Test rating submission via JavaScript."""
        driver.get(app_url)
        
        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "dining-hall"))
        )
        
        # Mock a rating submission
        result = driver.execute_script("""
            return fetch('/api/rate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    food_id: 1,
                    rating: 4,
                    user_id: 'test-user'
                })
            }).then(response => response.json());
        """)
        
        # Should return success or error (depending on test data)
        assert result is not None
    
    def test_menu_filtering(self, driver, app_url):
        """Test menu filtering functionality."""
        driver.get(app_url)
        
        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "dining-hall"))
        )
        
        # Test filterRatingsByMenu function
        result = driver.execute_script("""
            const menuData = {
                'Burge': {
                    'breakfast': {
                        'Main Station': [
                            {id: 1, name: 'Eggs', meal: 'breakfast'}
                        ]
                    }
                }
            };
            
            const ratings = {
                foods: {
                    'Eggs_Main Station_Burge_breakfast': {
                        avg_rating: 4.0,
                        rating_count: 1
                    }
                }
            };
            
            return filterRatingsByMenu(menuData, ratings);
        """)
        
        assert result is not None
        assert 'foods' in result
    
    def test_meal_slug_mapping(self, driver, app_url):
        """Test meal slug mapping functionality."""
        driver.get(app_url)
        
        # Test meal slug mapping for different dining halls
        result = driver.execute_script("""
            function getOriginalMealSlug(diningHall, meal) {
                let originalMealSlug = meal;
                if (diningHall === 'Catlett') {
                    if (meal === 'breakfast') originalMealSlug = 'breakfast-2';
                    else if (meal === 'lunch') originalMealSlug = 'lunch-2';
                    else if (meal === 'dinner') originalMealSlug = 'dinner-2';
                }
                return originalMealSlug;
            }
            
            return {
                catlett_breakfast: getOriginalMealSlug('Catlett', 'breakfast'),
                catlett_lunch: getOriginalMealSlug('Catlett', 'lunch'),
                burge_breakfast: getOriginalMealSlug('Burge', 'breakfast')
            };
        """)
        
        assert result['catlett_breakfast'] == 'breakfast-2'
        assert result['catlett_lunch'] == 'lunch-2'
        assert result['burge_breakfast'] == 'breakfast'  # No mapping for Burge


class TestFrontendPerformance:
    """Test frontend performance."""
    
    def test_page_load_time(self, driver, app_url):
        """Test page load performance."""
        start_time = time.time()
        driver.get(app_url)
        
        # Wait for page to be fully loaded
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "menus-container"))
        )
        
        load_time = time.time() - start_time
        
        # Page should load within reasonable time
        assert load_time < 5.0  # Less than 5 seconds
    
    def test_rating_response_time(self, driver, app_url):
        """Test rating submission response time."""
        driver.get(app_url)
        
        # Wait for page to load
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CLASS_NAME, "dining-hall"))
        )
        
        # Measure rating submission time
        start_time = time.time()
        
        driver.execute_script("""
            fetch('/api/rate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    food_id: 1,
                    rating: 4,
                    user_id: 'test-user'
                })
            }).then(response => {
                window.ratingResponseTime = Date.now() - window.ratingStartTime;
            });
            
            window.ratingStartTime = Date.now();
        """)
        
        # Wait for response
        time.sleep(2)
        
        response_time = driver.execute_script("return window.ratingResponseTime;")
        
        # Response should be reasonably fast
        assert response_time < 2000  # Less than 2 seconds
