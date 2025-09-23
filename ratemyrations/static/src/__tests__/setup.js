/**
 * Test setup for frontend tests
 */
import TestUtils from './TestUtils.js';

// Mock global objects
global.customElements = {
  define: jest.fn()
};

// Mock fetch globally
global.fetch = jest.fn();

// Mock localStorage
TestUtils.mockLocalStorage();

// Mock console methods
TestUtils.mockConsole();

// Setup DOM
document.body.innerHTML = '';

// Global test helpers
global.TestUtils = TestUtils;

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Mock performance
global.performance = {
  now: jest.fn(() => Date.now())
};

// Clean up after each test
afterEach(() => {
  document.body.innerHTML = '';
  jest.clearAllMocks();
});
