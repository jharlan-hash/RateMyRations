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

// Import components (will be created in Phase 2)
// import StarRating from './components/StarRating.js';
// import DatePicker from './components/DatePicker.js';
// import MenuContainer from './components/MenuContainer.js';

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
    // Components will be registered here in Phase 2
    console.log('📦 Registering components...');
  }
  
  /**
   * Initialize component instances
   */
  initializeComponentInstances() {
    // Component instances will be initialized here in Phase 2
    console.log('🔧 Initializing component instances...');
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
      
      this.state.setState({
        ratings,
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
  const app = new RateMyRationsApp();
  await app.init();
  
  // Make app globally available for debugging
  window.rateMyRationsApp = app;
});

export default RateMyRationsApp;
