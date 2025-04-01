/**
 * Cache Utilities
 * Utilities for caching data
 */

// Cache storage
const CACHE: Record<string, { data: any; expiry: number }> = {};

/**
 * Cache an item with a TTL
 */
export function cacheItem<T>(key: string, data: T, ttlInSeconds = 60): void {
  const expiry = Date.now() + ttlInSeconds * 1000;
  CACHE[key] = { data, expiry };
}

/**
 * Get an item from cache
 */
export function getCachedItem<T>(key: string): T | null {
  const cached = CACHE[key];
  
  if (!cached) {
    return null;
  }
  
  // Check if expired
  if (cached.expiry < Date.now()) {
    delete CACHE[key];
    return null;
  }
  
  return cached.data as T;
}

/**
 * Remove an item from cache
 */
export function removeCachedItem(key: string): void {
  delete CACHE[key];
}

/**
 * Clear all items from cache
 */
export function clearCache(): void {
  Object.keys(CACHE).forEach(key => {
    delete CACHE[key];
  });
}

/**
 * Get a cached value or fetch it if not available
 */
export async function getOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlInSeconds = 60
): Promise<T> {
  const cached = getCachedItem<T>(key);
  
  if (cached !== null) {
    return cached;
  }
  
  const data = await fetchFn();
  cacheItem(key, data, ttlInSeconds);
  return data;
}

/**
 * Clean expired items from cache
 */
export function cleanExpiredCache(): void {
  const now = Date.now();
  
  Object.entries(CACHE).forEach(([key, value]) => {
    if (value.expiry < now) {
      delete CACHE[key];
    }
  });
}

// Setup automatic cache cleaning interval
if (typeof window !== 'undefined') {
  // Only run in browser environment
  setInterval(cleanExpiredCache, 60000); // Clean every minute
}

// Export all cache utility functions
const cacheUtils = {
  cacheItem,
  getCachedItem,
  removeCachedItem,
  clearCache,
  getOrFetch,
  cleanExpiredCache
};

export default cacheUtils;