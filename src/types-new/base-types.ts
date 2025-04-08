/**
 * Common base types and utility types
 * These are fundamental types used throughout the application
 */

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Standard response interface for API calls
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  size: number;
}

/**
 * Pagination result
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

/**
 * Sorting parameters
 */
export interface SortingParams {
  sort_by: string;
  sort_order: 'asc' | 'desc';
}

/**
 * Common filter parameters
 */
export interface FilterParams {
  search?: string;
  status?: string[];
  created_after?: string;
  created_before?: string;
  updated_after?: string;
  updated_before?: string;
  [key: string]: any;
}

/**
 * Query parameters combining pagination, sorting, and filtering
 */
export interface QueryParams extends Partial<PaginationParams>, Partial<SortingParams>, Partial<FilterParams> {}

/**
 * Date range
 */
export interface DateRange {
  start: string;
  end: string;
}

/**
 * Common result status
 */
export type ResultStatus = 'success' | 'error' | 'warning' | 'info' | 'pending';

/**
 * Represents a resource with a name and ID
 */
export interface NamedResource {
  id: string;
  name: string;
}
