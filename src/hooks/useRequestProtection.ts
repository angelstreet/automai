import { useRef, useCallback } from 'react';

import { hasDataChanged } from '@/context/HelperContext';

// Request state with TTL management
interface RequestState {
  inProgress: boolean;
  lastUpdated: number;
  data?: any;
}

// Global request cache with TTL (5 minutes default)
const TTL = 5 * 60 * 1000; // 5 minutes
const requestCache: Record<string, RequestState> = {};

/**
 * Check if a cached request is still valid
 *
 * @param key - Cache key
 * @param customTTL - Optional custom TTL in ms
 * @returns True if cache entry exists and is valid
 */
const isCacheValid = (key: string, customTTL?: number): boolean => {
  const ttl = customTTL || TTL;
  const entry = requestCache[key];

  if (!entry) return false;

  const now = Date.now();
  return now - entry.lastUpdated < ttl;
};

/**
 * Clear cache entries by pattern
 *
 * @param pattern - String or RegExp to match against keys
 */
export const clearRequestCache = (pattern?: string | RegExp): void => {
  if (!pattern) {
    // Clear all cache
    Object.keys(requestCache).forEach((key) => {
      delete requestCache[key];
    });
    console.log('[RequestCache] Cleared all cache entries');
    return;
  }

  const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
  let cleared = 0;

  Object.keys(requestCache).forEach((key) => {
    if (regex.test(key)) {
      delete requestCache[key];
      cleared++;
    }
  });

  console.log(`[RequestCache] Cleared ${cleared} cache entries matching ${pattern}`);
};

/**
 * Hook to protect against infinite fetch loops and duplicate requests
 *
 * @param prefix - Debug prefix for logging
 * @returns Object with utility functions
 */
export function useRequestProtection(prefix = 'RequestProtection') {
  // Store component-level in-flight requests (for cases where global isn't sufficient)
  const inFlightRequests = useRef<Record<string, boolean>>({});

  // Store render count for debugging
  const renderCount = useRef(0);

  // Increment render count
  renderCount.current++;

  /**
   * Check if a request is already in progress
   *
   * @param requestKey - Identifier for the request
   * @returns true if the request can proceed (not in progress)
   */
  const canMakeRequest = useCallback(
    (requestKey: string): boolean => {
      // Check global cache first
      if (requestCache[requestKey] && requestCache[requestKey].inProgress) {
        console.log(
          `[${prefix}] Skip duplicate request: ${requestKey} (render #${renderCount.current}) - Global cache`,
        );
        return false;
      }

      // Then check component-level cache
      if (inFlightRequests.current[requestKey]) {
        console.log(
          `[${prefix}] Skip duplicate request: ${requestKey} (render #${renderCount.current}) - Component cache`,
        );
        return false;
      }
      return true;
    },
    [prefix],
  );

  /**
   * Wrap a fetch request with protection against duplicates and optional caching
   *
   * @param requestKey - Identifier for the request
   * @param fetchFn - The fetch function to execute
   * @param options - Optional settings for caching
   * @returns Promise with the fetch results
   */
  const protectedFetch = useCallback(
    async <T>(
      requestKey: string,
      fetchFn: () => Promise<T>,
      options?: {
        ttl?: number; // Custom TTL in ms
        force?: boolean; // Force refresh even if cache exists
      },
    ): Promise<T | null> => {
      const { ttl, force = false } = options || {};

      // Check if valid data exists in cache and not forcing refresh
      if (!force && isCacheValid(requestKey, ttl) && requestCache[requestKey].data !== undefined) {
        console.log(`[${prefix}] Using cached data for: ${requestKey}`);
        return requestCache[requestKey].data as T;
      }

      // Skip if already in progress
      if (!canMakeRequest(requestKey)) {
        return null;
      }

      // Mark as in progress in both caches
      inFlightRequests.current[requestKey] = true;
      requestCache[requestKey] = {
        inProgress: true,
        lastUpdated: Date.now(),
        data: requestCache[requestKey]?.data, // Keep existing data while fetching
      };

      console.log(`[${prefix}] Starting request: ${requestKey} (render #${renderCount.current})`);

      try {
        const result = await fetchFn();

        // Update cache with new data
        requestCache[requestKey] = {
          inProgress: false,
          lastUpdated: Date.now(),
          data: result,
        };

        return result;
      } catch (error) {
        console.error(`[${prefix}] Error in request ${requestKey}:`, error);
        // Update cache to mark request as not in progress
        if (requestCache[requestKey]) {
          requestCache[requestKey].inProgress = false;
        }
        throw error;
      } finally {
        // Mark as complete in component cache
        inFlightRequests.current[requestKey] = false;
        console.log(`[${prefix}] Completed request: ${requestKey}`);
      }
    },
    [canMakeRequest, prefix],
  );

  /**
   * Safely update state only if data has changed
   *
   * @param setState - setState function
   * @param prevData - Previous data
   * @param newData - New data
   * @param dataKey - Identifier for debugging
   * @returns true if state was updated
   */
  const safeUpdateState = useCallback(
    <T>(
      setState: React.Dispatch<React.SetStateAction<T>>,
      prevData: T,
      newData: T,
      dataKey: string,
    ): boolean => {
      // Check if data has actually changed
      if (!hasDataChanged(prevData, newData)) {
        console.log(`[${prefix}] Skipping state update for ${dataKey}, data unchanged`);
        return false;
      }

      // Update state
      setState(newData);
      return true;
    },
    [prefix],
  );

  /**
   * Get cache statistics for debugging
   */
  const getCacheStats = useCallback(() => {
    const now = Date.now();
    const stats = {
      totalEntries: Object.keys(requestCache).length,
      activeRequests: 0,
      validCache: 0,
      expiredCache: 0,
    };

    Object.keys(requestCache).forEach((key) => {
      const entry = requestCache[key];
      if (entry.inProgress) {
        stats.activeRequests++;
      }

      if (now - entry.lastUpdated < TTL) {
        stats.validCache++;
      } else {
        stats.expiredCache++;
      }
    });

    return stats;
  }, []);

  return {
    canMakeRequest,
    protectedFetch,
    safeUpdateState,
    renderCount: renderCount.current,
    getCacheStats,
    clearCache: clearRequestCache,
  };
}
