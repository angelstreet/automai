/**
 * API Utilities
 * Utilities for API integration and requests
 */
import appConfig from '@/lib/config/appConfig';
import cacheUtils from '@/lib/utils/cacheUtils';
import logUtils from '@/lib/utils/logUtils';

// Create a logger specific to API utilities
const logger = logUtils.createModuleLogger('apiUtils');

/**
 * API request options
 */
export interface ApiRequestOptions extends RequestInit {
  baseUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  cacheKey?: string;
  cacheTtl?: number;
}

/**
 * Default API request options
 */
const DEFAULT_OPTIONS: ApiRequestOptions = {
  baseUrl: appConfig.API.baseUrl,
  timeout: appConfig.API.timeout,
  retryAttempts: appConfig.API.retryAttempts,
  retryDelay: appConfig.API.retryDelay,
};

/**
 * Fetch with timeout
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<Response> {
  const { timeout = appConfig.API.timeout, ...fetchOptions } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry
 */
export async function fetchWithRetry(
  url: string,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const { 
    retryAttempts = DEFAULT_OPTIONS.retryAttempts,
    retryDelay = DEFAULT_OPTIONS.retryDelay,
    ...fetchOptions
  } = options;
  
  let lastError: Error | undefined;
  
  for (let attempt = 0; attempt <= retryAttempts!; attempt++) {
    try {
      // If not the first attempt, wait for the retry delay
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, retryDelay! * attempt));
        logger.info(`Retry attempt ${attempt} for ${url}`);
      }
      
      const response = await fetchWithTimeout(url, fetchOptions);
      
      // For 429 Too Many Requests, wait and retry
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const retryAfterMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : retryDelay;
        
        logger.warn(`Rate limited (429) on ${url}, retrying after ${retryAfterMs}ms`);
        await new Promise(resolve => setTimeout(resolve, retryAfterMs));
        continue;
      }
      
      // For 5xx errors, retry
      if (response.status >= 500 && response.status < 600) {
        lastError = new Error(`Server error: ${response.status}`);
        continue;
      }
      
      return response;
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if it's an abort error (e.g., from timeout)
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${options.timeout || DEFAULT_OPTIONS.timeout}ms`);
      }
      
      // If it's the last attempt, throw the error
      if (attempt === retryAttempts) {
        throw error;
      }
    }
  }
  
  throw lastError || new Error('Request failed after multiple attempts');
}

/**
 * API client to make requests with caching and retries
 */
export async function apiRequest<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    baseUrl = DEFAULT_OPTIONS.baseUrl,
    cacheKey,
    cacheTtl,
    ...fetchOptions
  } = options;
  
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  
  // If a cache key is provided, check if the response is cached
  if (cacheKey) {
    const cachedData = cacheUtils.getCachedItem<T>(cacheKey);
    
    if (cachedData) {
      logger.debug(`Using cached data for ${fullUrl}`);
      return cachedData;
    }
  }
  
  try {
    const response = await fetchWithRetry(fullUrl, fetchOptions);
    
    if (!response.ok) {
      let errorMessage: string;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || `Request failed with status ${response.status}`;
      } catch (e) {
        errorMessage = `Request failed with status ${response.status}`;
      }
      
      throw new Error(errorMessage);
    }
    
    // Parse the response as JSON
    const data = await response.json();
    
    // Cache the response if a cache key is provided
    if (cacheKey) {
      cacheUtils.cacheItem(cacheKey, data, cacheTtl || appConfig.CACHE.defaultTtl);
    }
    
    return data as T;
  } catch (error: any) {
    logger.error(`API request failed for ${fullUrl}`, { error: error.message });
    throw error;
  }
}

/**
 * Make a GET request
 */
export async function get<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'GET',
  });
}

/**
 * Make a POST request
 */
export async function post<T = any>(
  url: string,
  data: any,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
  });
}

/**
 * Make a PUT request
 */
export async function put<T = any>(
  url: string,
  data: any,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
  });
}

/**
 * Make a PATCH request
 */
export async function patch<T = any>(
  url: string,
  data: any,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    body: JSON.stringify(data),
  });
}

/**
 * Make a DELETE request
 */
export async function del<T = any>(
  url: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: 'DELETE',
  });
}

// Export API utility functions
const apiUtils = {
  fetchWithTimeout,
  fetchWithRetry,
  apiRequest,
  get,
  post,
  put,
  patch,
  delete: del, // Use 'del' as the function name since 'delete' is a reserved word
};

export default apiUtils;