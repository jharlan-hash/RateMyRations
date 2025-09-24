/**
 * Centralized state management for RateMyRations
 * Provides reactive state updates and persistence
 */
class AppState {
  constructor() {
    this.state = {
      // Core data
      menus: {},
      ratings: {},
      userRatings: {},
      
      // UI state
      currentDate: new Date().toISOString().split('T')[0],
      loading: false,
      error: null,
      expandedSections: new Set(),
      
      // User data
      browserId: this.getOrCreateBrowserId(),
      
      // Admin state
      adminMode: false,
      searchQuery: '',
      filterOptions: {}
    };
    
    this.listeners = new Map();
    this.loadFromStorage();
  }
  
  /**
   * Get or create a unique browser ID
   */
  getOrCreateBrowserId() {
    let browserId = localStorage.getItem('browserId');
    if (!browserId) {
      browserId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('browserId', browserId);
    }
    return browserId;
  }
  
  /**
   * Subscribe to state changes
   * @param {string} key - State key to watch
   * @param {Function} callback - Callback function
   */
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Update state and notify listeners
   * @param {Object} updates - State updates
   */
  setState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Notify listeners of changes
    Object.keys(updates).forEach(key => {
      const oldVal = oldState[key];
      const newVal = this.state[key];
      const changed = (oldVal instanceof Set && newVal instanceof Set)
        ? (oldVal.size !== newVal.size || [...oldVal].some(v => !newVal.has(v)))
        : (oldVal !== newVal);
      if (changed) {
        const callbacks = this.listeners.get(key) || [];
        callbacks.forEach(callback => callback(newVal, oldVal));
      }
    });
    
    this.saveToStorage();
  }
  
  /**
   * Get current state
   * @param {string} key - Optional key to get specific state
   */
  getState(key = null) {
    return key ? this.state[key] : this.state;
  }
  
  /**
   * Load state from localStorage
   */
  loadFromStorage() {
    try {
      const savedUserRatings = localStorage.getItem('userRatings');
      if (savedUserRatings) {
        this.state.userRatings = JSON.parse(savedUserRatings);
      }
      
      const savedExpandedSections = localStorage.getItem('expandedSections');
      if (savedExpandedSections) {
        this.state.expandedSections = new Set(JSON.parse(savedExpandedSections));
      }
    } catch (error) {
      console.warn('Failed to load state from storage:', error);
    }
  }
  
  /**
   * Save state to localStorage
   */
  saveToStorage() {
    try {
      localStorage.setItem('userRatings', JSON.stringify(this.state.userRatings));
      localStorage.setItem('expandedSections', JSON.stringify([...this.state.expandedSections]));
    } catch (error) {
      console.warn('Failed to save state to storage:', error);
    }
  }
  
  /**
   * Clear all state
   */
  clear() {
    this.state = {
      menus: {},
      ratings: {},
      userRatings: {},
      currentDate: new Date().toISOString().split('T')[0],
      loading: false,
      error: null,
      expandedSections: new Set(),
      browserId: this.getOrCreateBrowserId(),
      adminMode: false,
      searchQuery: '',
      filterOptions: {}
    };
    
    this.listeners.clear();
    this.saveToStorage();
  }
}

// Create global state instance
window.appState = new AppState();

export default AppState;
