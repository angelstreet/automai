// Debug settings
export const DEBUG = false;

// Monday.com configuration
export const MONDAY_CONFIG = {
  // Default iframe dimensions
  IFRAME_HEIGHT: '800px',
  IFRAME_WIDTH: '100%',

  // Refresh intervals (in milliseconds)
  REFRESH_INTERVAL: 30 * 1000, // 30 seconds
};

// Cache TTL settings (in milliseconds)
export const CACHE_TTL = {
  TASKS: 5 * 60 * 1000, // 5 minutes
};

// Request cooldown period to prevent excessive API calls
export const REQUEST_COOLDOWN = 5000; // 5 seconds

// Error messages
export const ERROR_MESSAGES = {
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  MONDAY_LOAD_ERROR: 'Failed to load Monday.com board',
  INVALID_BOARD_URL: 'Invalid Monday.com board URL',
};
