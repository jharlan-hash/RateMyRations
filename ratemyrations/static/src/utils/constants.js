/**
 * Constants for RateMyRations application
 */

// Dining hall configuration
export const DINING_HALLS = {
  BURGE: 'Burge',
  CATLETT: 'Catlett',
  HILLCREST: 'Hillcrest'
};

// Meal types
export const MEALS = {
  BREAKFAST: 'breakfast',
  LUNCH: 'lunch',
  DINNER: 'dinner'
};

// Rating values
export const RATING_VALUES = {
  MIN: 1,
  MAX: 5,
  REMOVE: 0
};

// API endpoints
export const API_ENDPOINTS = {
  MENUS: '/api/menus',
  RATINGS: '/api/ratings',
  RATE: '/api/rate',
  HEALTH: '/healthz',
  ADMIN_RATINGS: '/api/admin/ratings',
  ADMIN_DELETE_RATING: '/api/admin/delete-rating',
  ADMIN_BAN_USER: '/api/admin/ban-user',
  ADMIN_UNBAN_USER: '/api/admin/unban-user',
  ADMIN_UPDATE_NICKNAME: '/api/admin/update-nickname'
};

// Local storage keys
export const STORAGE_KEYS = {
  USER_RATINGS: 'userRatings',
  BROWSER_ID: 'browserId',
  EXPANDED_SECTIONS: 'expandedSections',
  ADMIN_TOKEN: 'adminToken'
};

// CSS classes
export const CSS_CLASSES = {
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success',
  ACTIVE: 'active',
  EXPANDED: 'expanded',
  COLLAPSED: 'collapsed',
  INTERACTIVE: 'interactive',
  READONLY: 'readonly'
};

// Event names
export const EVENTS = {
  RATING_CHANGED: 'rating-changed',
  MENU_LOADED: 'menu-loaded',
  ERROR_OCCURRED: 'error-occurred',
  LOADING_STARTED: 'loading-started',
  LOADING_FINISHED: 'loading-finished'
};

// Default values
export const DEFAULTS = {
  CACHE_DURATION: 30 * 60 * 1000, // 30 minutes
  DEBOUNCE_DELAY: 300, // 300ms
  THROTTLE_DELAY: 100, // 100ms
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000 // 1 second
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please wait a moment.',
  INVALID_RATING: 'Invalid rating value.',
  FOOD_NOT_FOUND: 'Food item not found.',
  USER_BANNED: 'User is banned.',
  UNAUTHORIZED: 'Unauthorized access.',
  UNKNOWN_ERROR: 'An unknown error occurred.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  RATING_SUBMITTED: 'Rating submitted successfully.',
  RATING_UPDATED: 'Rating updated successfully.',
  RATING_DELETED: 'Rating deleted successfully.',
  USER_BANNED: 'User banned successfully.',
  USER_UNBANNED: 'User unbanned successfully.',
  NICKNAME_UPDATED: 'Nickname updated successfully.'
};
