/**
 * Test utilities for frontend components
 */
export class TestUtils {
  /**
   * Create a mock DOM element
   */
  static createMockElement(tagName = 'div', attributes = {}) {
    const element = document.createElement(tagName);
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    return element;
  }
  
  /**
   * Wait for next tick
   */
  static async nextTick() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
  
  /**
   * Mock fetch API
   */
  static mockFetch(responses = {}) {
    const originalFetch = window.fetch;
    
    window.fetch = jest.fn().mockImplementation((url) => {
      const response = responses[url] || responses['*'] || { status: 200, json: () => ({}) };
      return Promise.resolve({
        ok: response.status < 400,
        status: response.status,
        json: () => Promise.resolve(response.json || {}),
        text: () => Promise.resolve(response.text || ''),
        ...response
      });
    });
    
    return () => {
      window.fetch = originalFetch;
    };
  }
  
  /**
   * Mock localStorage
   */
  static mockLocalStorage() {
    const store = {};
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
          store[key] = value;
        }),
        removeItem: jest.fn((key) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          Object.keys(store).forEach(key => delete store[key]);
        })
      },
      writable: true
    });
    
    return store;
  }
  
  /**
   * Create test data
   */
  static createTestData() {
    return {
      menus: {
        'Burge': {
          'breakfast': {
            'Main Station': [
              { id: 1, name: 'Scrambled Eggs', meal: 'breakfast' },
              { id: 2, name: 'Bacon', meal: 'breakfast' }
            ]
          }
        }
      },
      ratings: {
        1: { average: 4.2, count: 15 },
        2: { average: 3.8, count: 8 }
      },
      userRatings: {
        1: 4,
        2: 3
      }
    };
  }
  
  /**
   * Simulate user interaction
   */
  static simulateClick(element) {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  }
  
  /**
   * Simulate input change
   */
  static simulateInput(element, value) {
    element.value = value;
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
  }
  
  /**
   * Wait for component to render
   */
  static async waitForRender(component) {
    await this.nextTick();
    return component;
  }
  
  /**
   * Get component shadow root (if using shadow DOM)
   */
  static getShadowRoot(element) {
    return element.shadowRoot || element;
  }
  
  /**
   * Mock console methods
   */
  static mockConsole() {
    const originalConsole = { ...console };
    
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
    
    return () => {
      Object.assign(console, originalConsole);
    };
  }
  
  /**
   * Create mock custom event
   */
  static createCustomEvent(type, detail = {}) {
    return new CustomEvent(type, {
      detail,
      bubbles: true,
      cancelable: true
    });
  }
  
  /**
   * Assert element exists and has expected attributes
   */
  static assertElement(element, expectedAttributes = {}) {
    expect(element).toBeTruthy();
    Object.entries(expectedAttributes).forEach(([key, value]) => {
      expect(element.getAttribute(key)).toBe(value);
    });
  }
  
  /**
   * Assert element has expected classes
   */
  static assertClasses(element, expectedClasses) {
    expectedClasses.forEach(className => {
      expect(element.classList.contains(className)).toBe(true);
    });
  }
  
  /**
   * Assert element contains expected text
   */
  static assertText(element, expectedText) {
    expect(element.textContent).toContain(expectedText);
  }
}

export default TestUtils;
