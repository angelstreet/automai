/**
 * Standard response type for database operations
 * This ensures consistent error handling and type safety
 */
import { DbResponse } from './commonUtils';

/**
 * Helper function to create a successful database response
 * @param data The data to return
 * @returns A successful DbResponse
 */
export function createSuccessResponse<T>(data: T): DbResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Helper function to create an error database response
 * @param error The error message
 * @returns An error DbResponse
 */
export function createErrorResponse<T>(error: string): DbResponse<T> {
  return {
    success: false,
    error,
    data: null,
  };
}

/**
 * Helper function to handle database errors consistently
 * @param error The error object
 * @param context Optional context for error logging
 * @returns An error DbResponse
 */
export function handleDbError<T>(error: unknown, context = 'database operation'): DbResponse<T> {
  console.error(`[@db:handleDbError] Error in ${context}:`, error);
  const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
  return createErrorResponse<T>(errorMessage);
}

/**
 * Helper function to validate required parameters
 * @param params Object containing parameters to validate
 * @param requiredParams Array of required parameter names
 * @returns Error string if validation fails, null if passes
 */
export function validateRequiredParams(
  params: Record<string, any>,
  requiredParams: string[],
): string | null {
  const missingParams = requiredParams.filter((param) => params[param] === undefined);

  if (missingParams.length > 0) {
    return `Missing required parameters: ${missingParams.join(', ')}`;
  }

  return null;
}
