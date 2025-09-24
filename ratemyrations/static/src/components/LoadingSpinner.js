/**
 * LoadingSpinner Component
 * Displays loading states with customizable messages
 */
import BaseComponent from './BaseComponent.js';

class LoadingSpinner extends BaseComponent {
  constructor() {
    super();
    console.log('🌀 LoadingSpinner constructor called');
    this.message = 'Loading...';
    this.size = 'medium';
    this.overlay = false;
  }
  
  connectedCallback() {
    console.log('🔌 LoadingSpinner connected to DOM');
    super.connectedCallback();
  }
  
  static get observedAttributes() {
    return ['message', 'size', 'overlay'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.updateFromAttributes();
      this.render();
    }
  }
  
  updateFromAttributes() {
    this.message = this.getAttributeValue('message', 'Loading...');
    this.size = this.getAttributeValue('size', 'medium');
    this.overlay = this.getBooleanAttribute('overlay');
  }
  
  getTemplate() {
    const sizeClass = `spinner-${this.size}`;
    const overlayClass = this.overlay ? 'spinner-overlay' : '';
    
    return `
      <div class="loading-spinner ${sizeClass} ${overlayClass}">
        <div class="spinner-container">
          <div class="spinner"></div>
          <p class="spinner-message">${this.message}</p>
        </div>
      </div>
    `;
  }
  
  setMessage(message) {
    this.message = message;
    this.setAttribute('message', message);
  }
  
  setSize(size) {
    this.size = size;
    this.setAttribute('size', size);
  }
  
  setOverlay(overlay) {
    this.overlay = overlay;
    if (overlay) {
      this.setAttribute('overlay', 'true');
    } else {
      this.removeAttribute('overlay');
    }
  }
  
  show() {
    this.style.display = 'block';
  }
  
  hide() {
    this.style.display = 'none';
  }
  
  afterRender() {
    this.updateFromAttributes();
    this.subscribeToState();
  }
  
  subscribeToState() {
    // Subscribe to loading state changes
    this.subscriptions.push(
      this.state.subscribe('loading', (loading) => {
        if (loading) {
          this.show();
        } else {
          this.hide();
        }
      })
    );
  }
}

// Register the custom element
customElements.define('loading-spinner', LoadingSpinner);

export default LoadingSpinner;
