/**
 * Database Utilities
 * Common utilities and helpers for database operations
 */

/**
 * Standard database response interface
 */
export interface DbResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string;
  count?: number;
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(data: T, count?: number): DbResponse<T> {
  return {
    success: true,
    data,
    count
  };
}

/**
 * Create an error response
 */
export function createErrorResponse<T>(error: string): DbResponse<T> {
  return {
    success: false,
    error
  };
}

/**
 * Handle database errors in a consistent way
 */
export function handleDbError<T>(error: any, defaultMessage = 'Database operation failed'): DbResponse<T> {
  const errorMessage = error?.message || error?.error?.message || defaultMessage;
  console.error(`Database error: ${errorMessage}`, error);
  return createErrorResponse(errorMessage);
}

/**
 * Safely parse JSON from database
 */
export function safeParseJson<T>(jsonString: string | null, defaultValue: T): T {
  if (!jsonString) return defaultValue;
  
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Error parsing JSON from database', error);
    return defaultValue;
  }
}

/**
 * Format date for database operations
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Create pagination parameters for database queries
 */
export function createPaginationParams(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  return { from, to };
}

// Database utility functions export
const dbUtils = {
  createSuccessResponse,
  createErrorResponse,
  handleDbError,
  safeParseJson,
  formatDate,
  createPaginationParams
};

export default dbUtils;