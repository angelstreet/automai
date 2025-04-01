/**
 * Common operation names for context actions
 */
export const OPERATIONS = {
  // Fetch operations
  FETCH_ALL: 'FETCH_ALL',
  FETCH_ONE: 'FETCH_ONE',
  FETCH_MANY: 'FETCH_MANY',

  // CRUD operations
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',

  // Misc operations
  TEST_CONNECTION: 'TEST_CONNECTION',
  TEST_ALL_CONNECTIONS: 'TEST_ALL_CONNECTIONS',
  SYNC: 'SYNC',
  REFRESH: 'REFRESH',
  FILTER: 'FILTER',
  SORT: 'SORT',
};

/**
 * Loading state values
 */
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

/**
 * Error code prefixes for different contexts
 */
export const ERROR_CODE_PREFIXES = {
  HOST: 'HOST',
  DEPLOYMENT: 'DEPLOYMENT',
  REPOSITORY: 'REPOSITORY',
  CICD: 'CICD',
  AUTH: 'AUTH',
  GENERAL: 'GENERAL',
};

/**
 * Standard error codes
 */
export const ERROR_CODES = {
  // Not found errors
  NOT_FOUND: 'NOT_FOUND',

  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',

  // Input validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_FIELD: 'MISSING_FIELD',

  // Server errors
  SERVER_ERROR: 'SERVER_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // Connection errors
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  TIMEOUT: 'TIMEOUT',

  // Unknown error
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * Generate a context-specific error code
 * @param prefix The context prefix
 * @param code The error code
 * @returns The combined error code
 */
export function generateErrorCode(
  prefix: keyof typeof ERROR_CODE_PREFIXES,
  code: keyof typeof ERROR_CODES | string,
): string {
  return `${ERROR_CODE_PREFIXES[prefix]}_${code}`;
}
