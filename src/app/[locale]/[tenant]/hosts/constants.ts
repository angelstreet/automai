// Debug settings
export const DEBUG = false;

// Local storage keys
export const STORAGE_KEYS = {
  CACHED_HOSTS: 'cached_hosts',
  CACHED_HOSTS_TIME: 'cached_hosts_time',
  HOST_VIEW_MODE: 'hostViewMode',
};

// Cache TTL settings (in milliseconds)
export const CACHE_TTL = {
  HOSTS: 2 * 60 * 1000, // 2 minutes
};

// Request cooldown period to prevent excessive API calls
export const REQUEST_COOLDOWN = 5000; // 5 seconds

// Error messages
export const ERROR_MESSAGES = {
  FETCH_HOSTS: 'Failed to fetch hosts',
  CREATE_HOST: 'Failed to create host',
  UPDATE_HOST: 'Failed to update host',
  DELETE_HOST: 'Failed to delete host',
  TEST_CONNECTION: 'Connection test failed',
  UNEXPECTED_ERROR: 'An unexpected error occurred',
};

// View mode types
export type ViewMode = 'grid' | 'table';
export const DEFAULT_VIEW_MODE: ViewMode = 'grid';
