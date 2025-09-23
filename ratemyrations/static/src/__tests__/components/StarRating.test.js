/**
 * Tests for StarRating component
 */
import StarRating from '../components/StarRating.js';
import TestUtils from '../TestUtils.js';

describe('StarRating Component', () => {
  let starRating;
  let mockApiClient;
  
  beforeEach(() => {
    // Mock the global API client
    mockApiClient = {
      submitRating: jest.fn().mockResolvedValue({ status: 'success' })
    };
    window.apiClient = mockApiClient;
    
    // Mock the global state
    window.appState = {
      getState: jest.fn().mockReturnValue({
        browserId: 'test-browser-id',
        currentDate: '2025-01-01',
        userRatings: {},
        ratings: {}
      }),
      setState: jest.fn(),
      subscribe: jest.fn().mockReturnValue(() => {})
    };
    
    starRating = document.createElement('star-rating');
  });
  
  afterEach(() => {
    if (starRating.parentNode) {
      starRating.parentNode.removeChild(starRating);
    }
  });
  
  describe('Rendering', () => {
    test('should render interactive star rating', () => {
      starRating.setAttribute('food-id', '1');
      starRating.setAttribute('user-rating', '3');
      starRating.setAttribute('community-rating', '4.2');
      starRating.setAttribute('community-count', '15');
      starRating.setAttribute('interactive', 'true');
      
      document.body.appendChild(starRating);
      
      const container = starRating.querySelector('.star-rating-container');
      expect(container).toBeTruthy();
      expect(container.classList.contains('interactive')).toBe(true);
      
      const stars = starRating.querySelectorAll('.star');
      expect(stars).toHaveLength(5);
      
      const activeStars = starRating.querySelectorAll('.star.active');
      expect(activeStars).toHaveLength(3);
    });
    
    test('should render readonly star rating', () => {
      starRating.setAttribute('food-id', '1');
      starRating.setAttribute('community-rating', '4.2');
      starRating.setAttribute('community-count', '15');
      starRating.setAttribute('interactive', 'false');
      
      document.body.appendChild(starRating);
      
      const container = starRating.querySelector('.star-rating-container');
      expect(container.classList.contains('readonly')).toBe(true);
      
      const label = starRating.querySelector('.rating-label');
      expect(label.textContent).toContain('Community');
    });
    
    test('should generate histogram for interactive rating', () => {
      starRating.setAttribute('food-id', '1');
      starRating.setAttribute('community-count', '15');
      starRating.setAttribute('interactive', 'true');
      
      document.body.appendChild(starRating);
      
      const histogram = starRating.querySelector('.rating-histogram');
      expect(histogram).toBeTruthy();
      
      const bars = starRating.querySelectorAll('.histogram-bar');
      expect(bars).toHaveLength(5);
    });
  });
  
  describe('User Interaction', () => {
    test('should handle star click', async () => {
      starRating.setAttribute('food-id', '1');
      starRating.setAttribute('user-rating', '0');
      starRating.setAttribute('interactive', 'true');
      
      document.body.appendChild(starRating);
      await TestUtils.waitForRender(starRating);
      
      const thirdStar = starRating.querySelector('.star[data-value="3"]');
      TestUtils.simulateClick(thirdStar);
      
      expect(mockApiClient.submitRating).toHaveBeenCalledWith(
        '1', 3, 'test-browser-id', '2025-01-01'
      );
    });
    
    test('should toggle rating when clicking same star', async () => {
      starRating.setAttribute('food-id', '1');
      starRating.setAttribute('user-rating', '3');
      starRating.setAttribute('interactive', 'true');
      
      document.body.appendChild(starRating);
      await TestUtils.waitForRender(starRating);
      
      const thirdStar = starRating.querySelector('.star[data-value="3"]');
      TestUtils.simulateClick(thirdStar);
      
      expect(mockApiClient.submitRating).toHaveBeenCalledWith(
        '1', 0, 'test-browser-id', '2025-01-01'
      );
    });
    
    test('should handle hover effects', async () => {
      starRating.setAttribute('food-id', '1');
      starRating.setAttribute('user-rating', '2');
      starRating.setAttribute('interactive', 'true');
      
      document.body.appendChild(starRating);
      await TestUtils.waitForRender(starRating);
      
      const fourthStar = starRating.querySelector('.star[data-value="4"]');
      const mouseEnterEvent = new MouseEvent('mouseenter', { bubbles: true });
      fourthStar.dispatchEvent(mouseEnterEvent);
      
      const hoverStars = starRating.querySelectorAll('.star.hover');
      expect(hoverStars).toHaveLength(4);
    });
  });
  
  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      mockApiClient.submitRating.mockRejectedValue(new Error('API Error'));
      
      starRating.setAttribute('food-id', '1');
      starRating.setAttribute('user-rating', '0');
      starRating.setAttribute('interactive', 'true');
      
      document.body.appendChild(starRating);
      await TestUtils.waitForRender(starRating);
      
      const thirdStar = starRating.querySelector('.star[data-value="3"]');
      TestUtils.simulateClick(thirdStar);
      
      // Wait for async operation
      await TestUtils.nextTick();
      
      // Should revert to previous state
      const activeStars = starRating.querySelectorAll('.star.active');
      expect(activeStars).toHaveLength(0);
    });
    
    test('should prevent multiple simultaneous submissions', async () => {
      let resolvePromise;
      const promise = new Promise(resolve => {
        resolvePromise = resolve;
      });
      mockApiClient.submitRating.mockReturnValue(promise);
      
      starRating.setAttribute('food-id', '1');
      starRating.setAttribute('interactive', 'true');
      
      document.body.appendChild(starRating);
      await TestUtils.waitForRender(starRating);
      
      const thirdStar = starRating.querySelector('.star[data-value="3"]');
      
      // Click multiple times rapidly
      TestUtils.simulateClick(thirdStar);
      TestUtils.simulateClick(thirdStar);
      TestUtils.simulateClick(thirdStar);
      
      // Should only be called once
      expect(mockApiClient.submitRating).toHaveBeenCalledTimes(1);
      
      resolvePromise({ status: 'success' });
    });
  });
  
  describe('State Subscription', () => {
    test('should update when user ratings change', () => {
      const mockSubscribe = jest.fn().mockReturnValue(() => {});
      window.appState.subscribe = mockSubscribe;
      
      starRating.setAttribute('food-id', '1');
      document.body.appendChild(starRating);
      
      expect(mockSubscribe).toHaveBeenCalledWith('userRatings', expect.any(Function));
      expect(mockSubscribe).toHaveBeenCalledWith('ratings', expect.any(Function));
    });
  });
});

export default {};
