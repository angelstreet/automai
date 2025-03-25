// Debug settings
export const DEBUG = false;

// Local storage keys
export const STORAGE_KEYS = {
  CACHED_CICD: 'cached_cicd',
  CACHED_CICD_TIME: 'cached_cicd_time',
};

// Cache TTL settings (in milliseconds)
export const CACHE_TTL = {
  PROVIDERS: 5 * 60 * 1000, // 5 minutes
  JOBS: 2 * 60 * 1000, // 2 minutes
};

// Request cooldown period to prevent excessive API calls
export const REQUEST_COOLDOWN = 5000; // 5 seconds

// Initial state for the CICD context
export const INITIAL_STATE = {
  providers: [],
  jobs: [],
  builds: [],
  selectedProvider: null,
  selectedJob: null,
  loading: false,
  error: null,
  currentUser: null,
};

// Error messages
export const ERROR_MESSAGES = {
  FETCH_PROVIDERS: 'Failed to fetch CI/CD providers',
  CREATE_PROVIDER: 'Failed to create CI/CD provider',
  UPDATE_PROVIDER: 'Failed to update CI/CD provider',
  DELETE_PROVIDER: 'Failed to delete CI/CD provider',
  TEST_PROVIDER: 'Provider test failed',
  FETCH_JOBS: 'Failed to fetch CI/CD jobs',
  FETCH_JOB_DETAILS: 'Failed to fetch job details',
  TRIGGER_JOB: 'Failed to trigger job',
  UNEXPECTED_ERROR: 'An unexpected error occurred',
  CONTEXT_USAGE: 'useCICDContext must be used within a CICDProvider',
};

// Log prefix for consistent logging
export const LOG_PREFIX = '[CICDContext]';
