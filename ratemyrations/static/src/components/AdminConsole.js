/**
 * AdminConsole Component
 * Provides admin interface for managing ratings and users
 */
import BaseComponent from './BaseComponent.js';
import { API_ENDPOINTS, EVENTS, CSS_CLASSES } from '../utils/constants.js';
import { formatDate, formatTime, debounce } from '../utils/helpers.js';

class AdminConsole extends BaseComponent {
  constructor() {
    super();
    this.isVisible = false;
    this.adminToken = null;
    this.ratings = [];
    this.filteredRatings = [];
    this.filters = {
      search: '',
      diningHall: '',
      meal: '',
      dateFrom: '',
      dateTo: '',
      minRating: '',
      maxRating: ''
    };
    this.userNicknames = {};
    this.bannedUsers = new Set();
    this.isLoading = false;
  }
  
  static get observedAttributes() {
    return ['visible', 'admin-token'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.updateFromAttributes();
      if (name === 'visible') {
        this.toggleVisibility();
      }
    }
  }
  
  updateFromAttributes() {
    this.isVisible = this.getBooleanAttribute('visible');
    this.adminToken = this.getAttributeValue('admin-token');
  }
  
  getTemplate() {
    if (!this.isVisible) return '';
    
    return `
      <div class="admin-console-overlay">
        <div class="admin-console">
          <div class="admin-header">
            <h2>Admin Console</h2>
            <button class="close-btn" aria-label="Close admin console">×</button>
          </div>
          
          <div class="admin-content">
            ${this.generateFiltersSection()}
            ${this.generateStatsSection()}
            ${this.generateRatingsTable()}
          </div>
        </div>
      </div>
    `;
  }
  
  generateFiltersSection() {
    return `
      <div class="admin-filters">
        <h3>Filters</h3>
        <div class="filter-grid">
          <div class="filter-group">
            <label for="search-filter">Search Food</label>
            <input type="text" id="search-filter" placeholder="Search by food name..." value="${this.filters.search}">
          </div>
          
          <div class="filter-group">
            <label for="dining-hall-filter">Dining Hall</label>
            <select id="dining-hall-filter">
              <option value="">All</option>
              <option value="Burge" ${this.filters.diningHall === 'Burge' ? 'selected' : ''}>Burge</option>
              <option value="Catlett" ${this.filters.diningHall === 'Catlett' ? 'selected' : ''}>Catlett</option>
              <option value="Hillcrest" ${this.filters.diningHall === 'Hillcrest' ? 'selected' : ''}>Hillcrest</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="meal-filter">Meal</label>
            <select id="meal-filter">
              <option value="">All</option>
              <option value="breakfast" ${this.filters.meal === 'breakfast' ? 'selected' : ''}>Breakfast</option>
              <option value="lunch" ${this.filters.meal === 'lunch' ? 'selected' : ''}>Lunch</option>
              <option value="dinner" ${this.filters.meal === 'dinner' ? 'selected' : ''}>Dinner</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label for="date-from-filter">Date From</label>
            <input type="date" id="date-from-filter" value="${this.filters.dateFrom}">
          </div>
          
          <div class="filter-group">
            <label for="date-to-filter">Date To</label>
            <input type="date" id="date-to-filter" value="${this.filters.dateTo}">
          </div>
          
          <div class="filter-group">
            <label for="min-rating-filter">Min Rating</label>
            <input type="number" id="min-rating-filter" min="1" max="5" value="${this.filters.minRating}">
          </div>
          
          <div class="filter-group">
            <label for="max-rating-filter">Max Rating</label>
            <input type="number" id="max-rating-filter" min="1" max="5" value="${this.filters.maxRating}">
          </div>
          
          <div class="filter-actions">
            <button class="apply-filters-btn">Apply Filters</button>
            <button class="clear-filters-btn">Clear All</button>
            <button class="refresh-data-btn">Refresh Data</button>
          </div>
        </div>
      </div>
    `;
  }
  
  generateStatsSection() {
    const totalRatings = this.ratings.length;
    const filteredRatings = this.filteredRatings.length;
    const avgRating = totalRatings > 0 ? 
      (this.ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(2) : '0.00';
    
    return `
      <div class="admin-stats">
        <h3>Statistics</h3>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-label">Total Ratings</span>
            <span class="stat-value">${totalRatings}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Filtered Ratings</span>
            <span class="stat-value">${filteredRatings}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Average Rating</span>
            <span class="stat-value">${avgRating}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Banned Users</span>
            <span class="stat-value">${this.bannedUsers.size}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  generateRatingsTable() {
    if (this.isLoading) {
      return `
        <div class="admin-table-loading">
          <div class="spinner"></div>
          <p>Loading ratings...</p>
        </div>
      `;
    }
    
    if (this.filteredRatings.length === 0) {
      return `
        <div class="admin-table-empty">
          <p>No ratings found matching the current filters.</p>
        </div>
      `;
    }
    
    return `
      <div class="admin-table-container">
        <h3>Ratings (${this.filteredRatings.length})</h3>
        <div class="admin-table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Food Name</th>
                <th>Station</th>
                <th>Dining Hall</th>
                <th>Meal</th>
                <th>Rating</th>
                <th>User</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${this.filteredRatings.map(rating => this.generateRatingRow(rating)).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }
  
  generateRatingRow(rating) {
    const userDisplay = this.getUserDisplay(rating.user_id);
    const isBanned = this.bannedUsers.has(rating.user_id);
    
    return `
      <tr class="rating-row ${isBanned ? 'banned-user' : ''}" data-rating-id="${rating.id}">
        <td class="food-name">${rating.food_name}</td>
        <td class="station">${rating.station}</td>
        <td class="dining-hall">${rating.dining_hall}</td>
        <td class="meal">${this.capitalizeFirst(rating.meal)}</td>
        <td class="rating">
          <span class="rating-stars">${'★'.repeat(rating.rating)}</span>
          <span class="rating-value">${rating.rating}</span>
        </td>
        <td class="user">
          <div class="user-info">
            <span class="user-id">${rating.user_id}</span>
            <div class="user-actions">
              <input type="text" class="nickname-input" placeholder="Nickname" value="${this.userNicknames[rating.user_id] || ''}">
              <button class="update-nickname-btn" data-user-id="${rating.user_id}">Update</button>
              <button class="${isBanned ? 'unban' : 'ban'}-user-btn" data-user-id="${rating.user_id}">
                ${isBanned ? 'Unban' : 'Ban'}
              </button>
            </div>
          </div>
        </td>
        <td class="date">
          <span class="date-display">${formatDate(rating.date)}</span>
          <span class="time-display">${formatTime(rating.timestamp)}</span>
        </td>
        <td class="actions">
          <button class="delete-rating-btn" data-rating-id="${rating.id}" title="Delete this rating">
            🗑️
          </button>
        </td>
      </tr>
    `;
  }
  
  getUserDisplay(userId) {
    const nickname = this.userNicknames[userId];
    return nickname ? `${nickname} (${userId})` : userId;
  }
  
  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  attachEventListeners() {
    if (!this.isVisible) return;
    
    // Close button
    const closeBtn = this.querySelector('.close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', this.hide.bind(this));
    }
    
    // Overlay click to close
    const overlay = this.querySelector('.admin-console-overlay');
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.hide();
        }
      });
    }
    
    // Filter inputs
    this.setupFilterListeners();
    
    // Action buttons
    this.setupActionListeners();
  }
  
  setupFilterListeners() {
    const searchInput = this.querySelector('#search-filter');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(() => {
        this.filters.search = searchInput.value;
        this.applyFilters();
      }, 300));
    }
    
    const diningHallSelect = this.querySelector('#dining-hall-filter');
    if (diningHallSelect) {
      diningHallSelect.addEventListener('change', () => {
        this.filters.diningHall = diningHallSelect.value;
        this.applyFilters();
      });
    }
    
    const mealSelect = this.querySelector('#meal-filter');
    if (mealSelect) {
      mealSelect.addEventListener('change', () => {
        this.filters.meal = mealSelect.value;
        this.applyFilters();
      });
    }
    
    const dateFromInput = this.querySelector('#date-from-filter');
    if (dateFromInput) {
      dateFromInput.addEventListener('change', () => {
        this.filters.dateFrom = dateFromInput.value;
        this.applyFilters();
      });
    }
    
    const dateToInput = this.querySelector('#date-to-filter');
    if (dateToInput) {
      dateToInput.addEventListener('change', () => {
        this.filters.dateTo = dateToInput.value;
        this.applyFilters();
      });
    }
    
    const minRatingInput = this.querySelector('#min-rating-filter');
    if (minRatingInput) {
      minRatingInput.addEventListener('change', () => {
        this.filters.minRating = minRatingInput.value;
        this.applyFilters();
      });
    }
    
    const maxRatingInput = this.querySelector('#max-rating-filter');
    if (maxRatingInput) {
      maxRatingInput.addEventListener('change', () => {
        this.filters.maxRating = maxRatingInput.value;
        this.applyFilters();
      });
    }
    
    // Filter action buttons
    const applyBtn = this.querySelector('.apply-filters-btn');
    if (applyBtn) {
      applyBtn.addEventListener('click', () => this.applyFilters());
    }
    
    const clearBtn = this.querySelector('.clear-filters-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearFilters());
    }
    
    const refreshBtn = this.querySelector('.refresh-data-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.loadRatings());
    }
  }
  
  setupActionListeners() {
    // Delete rating buttons
    this.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-rating-btn')) {
        const ratingId = e.target.dataset.ratingId;
        this.deleteRating(ratingId);
      }
    });
    
    // Update nickname buttons
    this.addEventListener('click', (e) => {
      if (e.target.classList.contains('update-nickname-btn')) {
        const userId = e.target.dataset.userId;
        const input = e.target.previousElementSibling;
        const nickname = input.value.trim();
        this.updateUserNickname(userId, nickname);
      }
    });
    
    // Ban/unban user buttons
    this.addEventListener('click', (e) => {
      if (e.target.classList.contains('ban-user-btn')) {
        const userId = e.target.dataset.userId;
        this.banUser(userId);
      } else if (e.target.classList.contains('unban-user-btn')) {
        const userId = e.target.dataset.userId;
        this.unbanUser(userId);
      }
    });
  }
  
  async loadRatings() {
    if (!this.adminToken) {
      this.showError('Admin token required');
      return;
    }
    
    this.isLoading = true;
    this.render();
    
    try {
      const response = await window.apiClient.getAdminRatings(this.filters);
      this.ratings = response.ratings || [];
      this.userNicknames = response.userNicknames || {};
      this.bannedUsers = new Set(response.bannedUsers || []);
      
      this.applyFilters();
      
    } catch (error) {
      console.error('Error loading ratings:', error);
      this.showError('Failed to load ratings data');
    } finally {
      this.isLoading = false;
      this.render();
    }
  }
  
  applyFilters() {
    this.filteredRatings = this.ratings.filter(rating => {
      // Search filter
      if (this.filters.search && !rating.food_name.toLowerCase().includes(this.filters.search.toLowerCase())) {
        return false;
      }
      
      // Dining hall filter
      if (this.filters.diningHall && rating.dining_hall !== this.filters.diningHall) {
        return false;
      }
      
      // Meal filter
      if (this.filters.meal && rating.meal !== this.filters.meal) {
        return false;
      }
      
      // Date filters
      if (this.filters.dateFrom && rating.date < this.filters.dateFrom) {
        return false;
      }
      if (this.filters.dateTo && rating.date > this.filters.dateTo) {
        return false;
      }
      
      // Rating filters
      if (this.filters.minRating && rating.rating < parseInt(this.filters.minRating)) {
        return false;
      }
      if (this.filters.maxRating && rating.rating > parseInt(this.filters.maxRating)) {
        return false;
      }
      
      return true;
    });
    
    this.render();
  }
  
  clearFilters() {
    this.filters = {
      search: '',
      diningHall: '',
      meal: '',
      dateFrom: '',
      dateTo: '',
      minRating: '',
      maxRating: ''
    };
    
    // Reset form inputs
    const inputs = this.querySelectorAll('input, select');
    inputs.forEach(input => {
      if (input.type === 'text' || input.type === 'date' || input.type === 'number') {
        input.value = '';
      } else if (input.tagName === 'SELECT') {
        input.selectedIndex = 0;
      }
    });
    
    this.applyFilters();
  }
  
  async deleteRating(ratingId) {
    if (!this.adminToken) {
      this.showError('Admin token required');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this rating?')) {
      return;
    }
    
    try {
      await window.apiClient.deleteRating(ratingId, this.adminToken);
      
      // Remove from local data
      this.ratings = this.ratings.filter(r => r.id !== ratingId);
      this.applyFilters();
      
      this.showSuccess('Rating deleted successfully');
      
    } catch (error) {
      console.error('Error deleting rating:', error);
      this.showError('Failed to delete rating');
    }
  }
  
  async updateUserNickname(userId, nickname) {
    if (!this.adminToken) {
      this.showError('Admin token required');
      return;
    }
    
    try {
      await window.apiClient.updateUserNickname(userId, nickname, this.adminToken);
      
      // Update local data
      if (nickname) {
        this.userNicknames[userId] = nickname;
      } else {
        delete this.userNicknames[userId];
      }
      
      this.render();
      this.showSuccess('Nickname updated successfully');
      
    } catch (error) {
      console.error('Error updating nickname:', error);
      this.showError('Failed to update nickname');
    }
  }
  
  async banUser(userId) {
    if (!this.adminToken) {
      this.showError('Admin token required');
      return;
    }
    
    if (!confirm('Are you sure you want to ban this user?')) {
      return;
    }
    
    try {
      await window.apiClient.banUser(userId, this.adminToken);
      
      this.bannedUsers.add(userId);
      this.render();
      this.showSuccess('User banned successfully');
      
    } catch (error) {
      console.error('Error banning user:', error);
      this.showError('Failed to ban user');
    }
  }
  
  async unbanUser(userId) {
    if (!this.adminToken) {
      this.showError('Admin token required');
      return;
    }
    
    try {
      await window.apiClient.unbanUser(userId, this.adminToken);
      
      this.bannedUsers.delete(userId);
      this.render();
      this.showSuccess('User unbanned successfully');
      
    } catch (error) {
      console.error('Error unbanning user:', error);
      this.showError('Failed to unban user');
    }
  }
  
  show() {
    this.isVisible = true;
    this.setAttribute('visible', 'true');
    this.loadRatings();
  }
  
  hide() {
    this.isVisible = false;
    this.removeAttribute('visible');
  }
  
  toggleVisibility() {
    if (this.isVisible) {
      this.show();
    } else {
      this.hide();
    }
  }
  
  subscribeToState() {
    // Subscribe to admin mode changes
    this.subscriptions.push(
      this.state.subscribe('adminMode', (adminMode) => {
        if (adminMode) {
          this.show();
        } else {
          this.hide();
        }
      })
    );
  }
  
  afterRender() {
    this.updateFromAttributes();
    this.attachEventListeners();
  }
}

// Register the custom element
customElements.define('admin-console', AdminConsole);

export default AdminConsole;
