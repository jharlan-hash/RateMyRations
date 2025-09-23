/**
 * ErrorBoundary Component
 * Catches and displays errors gracefully
 */
import BaseComponent from './BaseComponent.js';
import { EVENTS, CSS_CLASSES } from '../utils/constants.js';

class ErrorBoundary extends BaseComponent {
  constructor() {
    super();
    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
    this.retryCount = 0;
    this.maxRetries = 3;
  }
  
  static get observedAttributes() {
    return ['max-retries'];
  }
  
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.maxRetries = parseInt(this.getAttributeValue('max-retries', '3'));
    }
  }
  
  getTemplate() {
    if (!this.hasError) {
      return `<slot></slot>`;
    }
    
    return `
      <div class="error-boundary">
        <div class="error-boundary-content">
          <div class="error-icon">⚠️</div>
          <h3 class="error-title">Something went wrong</h3>
          <p class="error-message">${this.getErrorMessage()}</p>
          
          ${this.generateErrorDetails()}
          
          <div class="error-actions">
            <button class="retry-btn" ${this.retryCount >= this.maxRetries ? 'disabled' : ''}>
              Try Again ${this.retryCount > 0 ? `(${this.retryCount}/${this.maxRetries})` : ''}
            </button>
            <button class="report-btn">Report Issue</button>
            <button class="reload-btn">Reload Page</button>
          </div>
          
          ${this.generateDebugInfo()}
        </div>
      </div>
    `;
  }
  
  getErrorMessage() {
    if (!this.error) return 'An unexpected error occurred.';
    
    // User-friendly error messages
    const errorMessages = {
      'NetworkError': 'Unable to connect to the server. Please check your internet connection.',
      'TypeError': 'There was a problem processing the data. Please try again.',
      'ReferenceError': 'A component failed to load properly. Please refresh the page.',
      'SyntaxError': 'There was a problem with the application code. Please contact support.',
      'ChunkLoadError': 'Failed to load application resources. Please refresh the page.',
      'SecurityError': 'A security error occurred. Please check your browser settings.'
    };
    
    const errorType = this.error.constructor.name;
    return errorMessages[errorType] || this.error.message || 'An unexpected error occurred.';
  }
  
  generateErrorDetails() {
    if (!this.error) return '';
    
    return `
      <details class="error-details">
        <summary>Technical Details</summary>
        <div class="error-details-content">
          <p><strong>Error Type:</strong> ${this.error.constructor.name}</p>
          <p><strong>Error Message:</strong> ${this.error.message}</p>
          ${this.error.stack ? `<pre class="error-stack">${this.error.stack}</pre>` : ''}
          ${this.errorInfo ? `<pre class="error-info">${this.errorInfo}</pre>` : ''}
        </div>
      </details>
    `;
  }
  
  generateDebugInfo() {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.retryCount,
      state: this.state.getState()
    };
    
    return `
      <details class="debug-info">
        <summary>Debug Information</summary>
        <pre class="debug-content">${JSON.stringify(debugInfo, null, 2)}</pre>
      </details>
    `;
  }
  
  attachEventListeners() {
    if (!this.hasError) return;
    
    const retryBtn = this.querySelector('.retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', this.handleRetry.bind(this));
    }
    
    const reportBtn = this.querySelector('.report-btn');
    if (reportBtn) {
      reportBtn.addEventListener('click', this.handleReport.bind(this));
    }
    
    const reloadBtn = this.querySelector('.reload-btn');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', this.handleReload.bind(this));
    }
  }
  
  handleRetry() {
    if (this.retryCount >= this.maxRetries) return;
    
    this.retryCount++;
    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
    
    this.render();
    
    // Dispatch retry event
    this.dispatchCustomEvent('error-boundary-retry', {
      retryCount: this.retryCount,
      maxRetries: this.maxRetries
    });
  }
  
  handleReport() {
    const errorReport = {
      error: this.error ? {
        name: this.error.constructor.name,
        message: this.error.message,
        stack: this.error.stack
      } : null,
      errorInfo: this.errorInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.retryCount
    };
    
    // In a real application, this would send to an error reporting service
    console.log('Error Report:', errorReport);
    
    // For now, copy to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2)).then(() => {
      this.showSuccess('Error report copied to clipboard');
    }).catch(() => {
      this.showError('Failed to copy error report');
    });
  }
  
  handleReload() {
    window.location.reload();
  }
  
  // Static method to catch errors
  static catchError(error, errorInfo) {
    // Find all error boundaries in the DOM
    const errorBoundaries = document.querySelectorAll('error-boundary');
    
    // Notify the first error boundary found
    if (errorBoundaries.length > 0) {
      const errorBoundary = errorBoundaries[0];
      errorBoundary.handleError(error, errorInfo);
    } else {
      // Fallback: show global error
      console.error('Uncaught error:', error, errorInfo);
      ErrorBoundary.showGlobalError(error);
    }
  }
  
  static showGlobalError(error) {
    const errorEl = document.createElement('div');
    errorEl.className = 'global-error';
    errorEl.innerHTML = `
      <div class="global-error-content">
        <h3>Application Error</h3>
        <p>${error.message || 'An unexpected error occurred.'}</p>
        <button onclick="window.location.reload()">Reload Page</button>
      </div>
    `;
    
    document.body.appendChild(errorEl);
  }
  
  handleError(error, errorInfo) {
    this.hasError = true;
    this.error = error;
    this.errorInfo = errorInfo;
    
    // Log error
    console.error('ErrorBoundary caught error:', error, errorInfo);
    
    // Dispatch error event
    this.dispatchCustomEvent(EVENTS.ERROR_OCCURRED, {
      error,
      errorInfo,
      component: this.tagName.toLowerCase()
    });
    
    // Update global state
    this.state.setState({ error: error.message });
    
    this.render();
  }
  
  // Method to reset error state
  reset() {
    this.hasError = false;
    this.error = null;
    this.errorInfo = null;
    this.retryCount = 0;
    this.render();
  }
  
  subscribeToState() {
    // Subscribe to global error state
    this.subscriptions.push(
      this.state.subscribe('error', (error) => {
        if (error && !this.hasError) {
          this.handleError(new Error(error), null);
        }
      })
    );
  }
  
  afterRender() {
    this.updateFromAttributes();
    this.attachEventListeners();
  }
}

// Set up global error handling
window.addEventListener('error', (event) => {
  ErrorBoundary.catchError(event.error, {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

window.addEventListener('unhandledrejection', (event) => {
  ErrorBoundary.catchError(new Error(event.reason), {
    type: 'unhandledrejection'
  });
});

// Register the custom element
customElements.define('error-boundary', ErrorBoundary);

export default ErrorBoundary;
