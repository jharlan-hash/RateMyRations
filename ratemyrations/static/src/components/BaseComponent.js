/**
 * Base component class for all RateMyRations components
 * Provides common functionality and lifecycle management
 */
class BaseComponent extends HTMLElement {
  constructor() {
    super();
    this.state = window.appState;
    this.subscriptions = [];
    this.debounceTimers = new Map();
  }
  
  /**
   * Called when component is added to DOM
   */
  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this.subscribeToState();
    this.afterRender();
  }
  
  /**
   * Called when component is removed from DOM
   */
  disconnectedCallback() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.debounceTimers.forEach(timer => clearTimeout(timer));
    this.debounceTimers.clear();
  }
  
  /**
   * Render the component
   */
  render() {
    this.innerHTML = this.getTemplate();
  }
  
  /**
   * Get component template - must be implemented by subclasses
   * @returns {string} HTML template
   */
  getTemplate() {
    throw new Error('getTemplate must be implemented by subclass');
  }
  
  /**
   * Called after render - override in subclasses
   */
  afterRender() {
    // Override in subclasses
  }
  
  /**
   * Attach event listeners - override in subclasses
   */
  attachEventListeners() {
    // Override in subclasses
  }
  
  /**
   * Subscribe to state changes - override in subclasses
   */
  subscribeToState() {
    // Override in subclasses
  }
  
  /**
   * Debounce function calls
   * @param {string} key - Unique key for the debounced function
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   */
  debounce(key, fn, delay = 300) {
    if (this.debounceTimers.has(key)) {
      clearTimeout(this.debounceTimers.get(key));
    }
    
    const timer = setTimeout(() => {
      fn();
      this.debounceTimers.delete(key);
    }, delay);
    
    this.debounceTimers.set(key, timer);
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   * @param {string} type - Error type (error, warning, info)
   */
  showError(message, type = 'error') {
    // Create or update error element
    let errorEl = this.querySelector('.error-message');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'error-message';
      this.appendChild(errorEl);
    }
    
    errorEl.textContent = message;
    errorEl.className = `error-message ${type}`;
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (errorEl && errorEl.parentNode) {
        errorEl.remove();
      }
    }, 5000);
  }
  
  /**
   * Show loading state
   * @param {boolean} loading - Whether to show loading
   */
  setLoading(loading) {
    if (loading) {
      this.classList.add('loading');
    } else {
      this.classList.remove('loading');
    }
  }
  
  /**
   * Dispatch custom event
   * @param {string} eventName - Event name
   * @param {Object} detail - Event detail
   */
  dispatchCustomEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });
    this.dispatchEvent(event);
  }
  
  /**
   * Get attribute value with default
   * @param {string} name - Attribute name
   * @param {*} defaultValue - Default value
   */
  getAttributeValue(name, defaultValue = null) {
    const value = this.getAttribute(name);
    return value !== null ? value : defaultValue;
  }
  
  /**
   * Get boolean attribute value
   * @param {string} name - Attribute name
   */
  getBooleanAttribute(name) {
    return this.hasAttribute(name) && this.getAttribute(name) !== 'false';
  }
}

export default BaseComponent;
