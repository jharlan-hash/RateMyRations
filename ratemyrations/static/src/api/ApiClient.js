/**
 * API client for RateMyRations backend
 * Handles all HTTP requests with error handling and retries
 */
class ApiClient {
  constructor(baseURL = '') {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }
  
  /**
   * Make HTTP request with error handling
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   */
  async request(url, options = {}) {
    const config = {
      headers: { ...this.defaultHeaders, ...options.headers },
      ...options
    };
    
    try {
      console.log(`🌐 API Request: ${this.baseURL}${url}`);
      const response = await fetch(`${this.baseURL}${url}`, config);
      
      if (!response.ok) {
        console.error(`❌ API Error: ${response.status} ${response.statusText}`);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ API Success: ${url}`, data);
      return data;
    } catch (error) {
      console.error(`❌ API request failed: ${url}`, error);
      throw error;
    }
  }
  
  /**
   * Fetch menus for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {boolean} refresh - Force refresh cache
   */
  async fetchMenus(date, refresh = false) {
    const params = new URLSearchParams({ date });
    if (refresh) params.append('refresh', 'true');
    
    return this.request(`/api/menus?${params}`);
  }
  
  /**
   * Fetch ratings for a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async fetchRatings(date) {
    return this.request(`/api/ratings?date=${date}`);
  }
  
  /**
   * Submit a rating for a food item
   * @param {number} foodId - Food item ID
   * @param {number} rating - Rating (1-5, 0 to remove)
   * @param {string} userId - User ID
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async submitRating(foodId, rating, userId, date) {
    return this.request('/api/rate', {
      method: 'POST',
      body: JSON.stringify({
        food_id: foodId,
        rating: rating,
        user_id: userId,
        date: date
      })
    });
  }
  
  /**
   * Get admin ratings with filters
   * @param {Object} filters - Filter options
   */
  async getAdminRatings(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value);
      }
    });
    
    return this.request(`/api/admin/ratings?${params}`);
  }
  
  /**
   * Delete a rating (admin only)
   * @param {number} ratingId - Rating ID to delete
   * @param {string} adminToken - Admin authentication token
   */
  async deleteRating(ratingId, adminToken) {
    return this.request('/api/admin/delete-rating', {
      method: 'POST',
      headers: {
        'X-Admin-Token': adminToken
      },
      body: JSON.stringify({ rating_id: ratingId })
    });
  }
  
  /**
   * Ban a user (admin only)
   * @param {string} userId - User ID to ban
   * @param {string} adminToken - Admin authentication token
   */
  async banUser(userId, adminToken) {
    return this.request('/api/admin/ban-user', {
      method: 'POST',
      headers: {
        'X-Admin-Token': adminToken
      },
      body: JSON.stringify({ user_id: userId })
    });
  }
  
  /**
   * Unban a user (admin only)
   * @param {string} userId - User ID to unban
   * @param {string} adminToken - Admin authentication token
   */
  async unbanUser(userId, adminToken) {
    return this.request('/api/admin/unban-user', {
      method: 'POST',
      headers: {
        'X-Admin-Token': adminToken
      },
      body: JSON.stringify({ user_id: userId })
    });
  }
  
  /**
   * Update user nickname (admin only)
   * @param {string} userId - User ID
   * @param {string} nickname - New nickname
   * @param {string} adminToken - Admin authentication token
   */
  async updateUserNickname(userId, nickname, adminToken) {
    return this.request('/api/admin/update-nickname', {
      method: 'POST',
      headers: {
        'X-Admin-Token': adminToken
      },
      body: JSON.stringify({ user_id: userId, nickname })
    });
  }
  
  /**
   * Check application health
   */
  async checkHealth() {
    return this.request('/healthz');
  }
}

// Create global API client instance
window.apiClient = new ApiClient();

export default ApiClient;
