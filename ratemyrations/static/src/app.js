/**
 * RateMyRations Frontend Application
 * Main entry point for the refactored frontend
 */

// Import core modules
import AppState from './state/AppState.js';
import ApiClient from './api/ApiClient.js';
import BaseComponent from './components/BaseComponent.js';

// Import utilities
import { getCurrentMeal, debounce } from './utils/helpers.js';
import { DINING_HALLS, MEALS, EVENTS } from './utils/constants.js';

// Import components
import StarRating from './components/StarRating.js';
import DatePicker from './components/DatePicker.js';
import MenuContainer from './components/MenuContainer.js';
import AdminConsole from './components/AdminConsole.js';
import ErrorBoundary from './components/ErrorBoundary.js';
import LoadingSpinner from './components/LoadingSpinner.js';

/**
 * Main application class
 */
class RateMyRationsApp {
  constructor() {
    this.state = window.appState;
    this.api = window.apiClient;
    this.components = new Map();
    this.initialized = false;
  }
  
  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;
    
    try {
      console.log('🚀 Initializing RateMyRations...');
      
      // Set up global error handling
      this.setupErrorHandling();
      
      // Initialize components
      await this.initializeComponents();
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Load initial data
      await this.loadInitialData();
      
      this.initialized = true;
      console.log('✅ RateMyRations initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize RateMyRations:', error);
      this.showError('Failed to initialize application');
    }
  }
  
  /**
   * Set up global error handling
   */
  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      console.error('Global error:', event.error);
      this.state.setState({ error: event.error.message });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
      this.state.setState({ error: event.reason.message || 'Unknown error' });
    });
  }
  
  /**
   * Initialize all components
   */
  async initializeComponents() {
    // Register custom elements
    this.registerComponents();
    
    // Initialize component instances
    this.initializeComponentInstances();
  }
  
  /**
   * Register custom elements
   */
  registerComponents() {
    console.log('📦 Registering components...');
    
    // Components are auto-registered when imported
    // All components are now available: StarRating, DatePicker, MenuContainer, 
    // AdminConsole, ErrorBoundary, LoadingSpinner
    console.log('✅ All components registered');
  }
  
  /**
   * Initialize component instances
   */
  initializeComponentInstances() {
    console.log('🔧 Initializing component instances...');
    
    // Wait for custom elements to be fully upgraded
    setTimeout(() => {
      // Initialize all components
      const components = [
        'menu-container',
        'date-picker', 
        'loading-spinner',
        'error-boundary',
        'admin-console'
      ];
      
      console.log('🔍 DOM Debug Info:');
      console.log('All elements:', document.querySelectorAll('*'));
      console.log('Custom elements:', document.querySelectorAll('menu-container, date-picker, loading-spinner, error-boundary, admin-console'));
      
      components.forEach(componentName => {
        const element = document.querySelector(componentName);
        if (element) {
          console.log(`✅ Initialized ${componentName}`, element);
        } else {
          console.warn(`⚠️ Component ${componentName} not found in DOM`);
        }
      });
      
      // Set up admin toggle
      this.setupAdminToggle();
    }, 100); // Small delay to ensure custom elements are upgraded
  }
  
  /**
   * Set up admin console toggle
   */
  setupAdminToggle() {
    const adminToggle = document.querySelector('.admin-toggle');
    if (adminToggle) {
      adminToggle.addEventListener('click', () => {
        const adminMode = !this.state.getState('adminMode');
        this.state.setState({ adminMode });
      });
    }
  }
  
  /**
   * Set up application event listeners
   */
  setupEventListeners() {
    // Listen for state changes
    this.state.subscribe('error', (error) => {
      if (error) {
        this.showError(error);
      }
    });
    
    this.state.subscribe('loading', (loading) => {
      this.setLoadingState(loading);
    });
    
    // Listen for custom events
    document.addEventListener(EVENTS.RATING_CHANGED, this.handleRatingChanged.bind(this));
    document.addEventListener(EVENTS.ERROR_OCCURRED, this.handleError.bind(this));

    // React to date changes from state
    this.state.subscribe('currentDate', (newDate, oldDate) => {
      if (newDate && newDate !== oldDate) {
        this.loadDataForDate(newDate).catch((e) => {
          console.error('Failed loading data for new date:', e);
        });
      }
    });

    // Handle refresh requests from components (e.g., MenuContainer)
    document.addEventListener('refresh-menus', (event) => {
      const date = event?.detail?.date || this.state.getState('currentDate');
      this.loadDataForDate(date, true).catch((e) => {
        console.error('Failed refreshing menus:', e);
      });
    });
  }
  
  /**
   * Load initial application data
   */
  async loadInitialData() {
    try {
      this.state.setState({ loading: true });
      
      // Load ratings and menus in parallel
      const [ratings, menus] = await Promise.all([
        this.api.fetchRatings(this.state.getState('currentDate')),
        this.api.fetchMenus(this.state.getState('currentDate'))
      ]);
      
      const ratingsById = this.buildRatingsIndex(menus, ratings);
      
      this.state.setState({
        ratings: ratingsById,
        menus,
        loading: false
      });
      
      console.log('📊 Initial data loaded');
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      this.state.setState({ 
        loading: false,
        error: 'Failed to load menu data'
      });
    }
  }

  /**
   * Load data for a specific date
   * @param {string} date
   * @param {boolean} refresh
   */
  async loadDataForDate(date, refresh = false) {
    try {
      this.state.setState({ loading: true });
      const [ratings, menus] = await Promise.all([
        this.api.fetchRatings(date),
        this.api.fetchMenus(date, refresh)
      ]);
      const ratingsById = this.buildRatingsIndex(menus, ratings);
      this.state.setState({ ratings: ratingsById, menus, loading: false });
    } catch (error) {
      console.error('Failed to load data for date:', date, error);
      this.state.setState({ loading: false, error: 'Failed to load menu data' });
    }
  }

  /**
   * Build an ID-keyed ratings index from backend aggregates
   * @param {Object} menus
   * @param {Object} ratingsResponse
   * @returns {Object} ratingsById { [foodId]: { average, count, dist? } }
   */
  buildRatingsIndex(menus, ratingsResponse) {
    const ratingsByKey = (ratingsResponse && ratingsResponse.foods) || {};
    const index = {};
    if (!menus || typeof menus !== 'object') return index;
    
    Object.keys(menus).forEach((diningHall) => {
      const hall = menus[diningHall] || {};
      Object.keys(hall).forEach((meal) => {
        const mealStations = hall[meal] || {};
        Object.keys(mealStations).forEach((station) => {
          const items = mealStations[station] || [];
          items.forEach((item) => {
            // item.meal is the original meal slug from backend (e.g., dinner-3)
            const originalMealSlug = item.meal;
            const key = `${item.name}_${station}_${diningHall}_${originalMealSlug}`;
            const agg = ratingsByKey[key];
            if (agg) {
              index[item.id] = {
                average: agg.avg_rating,
                count: agg.rating_count,
                dist: agg.dist || null,
              };
            }
          });
        });
      });
    });
    return index;
  }
  
  /**
   * Handle rating changes
   * @param {CustomEvent} event - Rating changed event
   */
  handleRatingChanged(event) {
    const { foodId, rating } = event.detail;
    console.log(`⭐ Rating changed: ${foodId} -> ${rating}`);
    
    // Update user ratings in state
    const userRatings = { ...this.state.getState('userRatings') };
    if (rating === 0) {
      delete userRatings[foodId];
    } else {
      userRatings[foodId] = rating;
    }
    
    this.state.setState({ userRatings });
  }
  
  /**
   * Handle errors
   * @param {CustomEvent} event - Error event
   */
  handleError(event) {
    const { error, component } = event.detail;
    console.error(`Error in ${component}:`, error);
    this.showError(error.message || 'An error occurred');
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    // Create error notification
    const errorEl = document.createElement('div');
    errorEl.className = 'error-notification';
    errorEl.textContent = message;
    
    // Add to page
    document.body.appendChild(errorEl);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (errorEl.parentNode) {
        errorEl.remove();
      }
    }, 5000);
  }
  
  /**
   * Set loading state
   * @param {boolean} loading - Whether loading
   */
  setLoadingState(loading) {
    const body = document.body;
    if (loading) {
      body.classList.add('loading');
    } else {
      body.classList.remove('loading');
    }
  }
  
  /**
   * Get component by name
   * @param {string} name - Component name
   * @returns {BaseComponent|null} Component instance
   */
  getComponent(name) {
    return this.components.get(name) || null;
  }
  
  /**
   * Register component instance
   * @param {string} name - Component name
   * @param {BaseComponent} component - Component instance
   */
  registerComponent(name, component) {
    this.components.set(name, component);
  }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const app = new RateMyRationsApp();
    await app.init();
    
    // Make app globally available for debugging
    window.rateMyRationsApp = app;
    
    console.log('✅ RateMyRations application initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize RateMyRations:', error);
    
    // Show error in UI
    const errorEl = document.createElement('div');
    errorEl.className = 'global-error';
    errorEl.innerHTML = `
      <div class="global-error-content">
        <h3>Application Error</h3>
        <p>Failed to initialize the application. Please refresh the page.</p>
        <button onclick="window.location.reload()">Reload Page</button>
      </div>
    `;
    document.body.appendChild(errorEl);
  }
});

export default RateMyRationsApp;
