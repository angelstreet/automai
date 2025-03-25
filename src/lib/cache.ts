/**
 * Enhanced server-side caching utility for Next.js
 * Provides in-memory caching with pattern-based invalidation for data fetching operations
 */

// Enable or disable debug logging
const DEBUG = process.env.NODE_ENV === 'development';

// Log only in debug mode
const log = (...args: any[]) => {
  if (DEBUG) {
    console.log('[ServerCache]', ...args);
  }
};

// Create a "global" singleton cache that persists between requests
declare global {
  var _globalCache: Map<string, any> | undefined;
}

// Use the global cache if it exists, or create a new one
global._globalCache = global._globalCache || new Map();

// Cache entry with metadata
type CacheEntry<T> = {
  value: T;
  expiry: number;
  created: number;
  tags?: string[]; // Optional tags for grouping related cache entries
  source?: string; // Where the cached data came from (e.g., "getUser", "getRepository")
};

// Cache statistics for monitoring
type CacheStats = {
  size: number;
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  oldestEntry: number | null;
  newestEntry: number | null;
};

class ServerCache {
  private cache: Map<string, CacheEntry<any>>;
  // Increased default TTL to 15 minutes
  private defaultTTL = 15 * 60 * 1000;

  // Stats tracking
  private hits = 0;
  private misses = 0;
  private totalRequests = 0;

  constructor() {
    // Use the global cache instance instead of creating a new one each time
    this.cache = global._globalCache || new Map();
    
    // No automatic cleanup - will be done on-demand
    if (typeof window === 'undefined') {
      log('Initialized server-side cache with global persistence');
    }
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @param options Optional settings
   * @returns Cached value or undefined if not found or expired
   */
  get<T>(key: string, options?: { source?: string }): T | undefined {
    this.totalRequests++;
    const entry = this.cache.get(key);
    const source = options?.source || 'unknown';

    if (!entry) {
      this.misses++;
      log(`MISS: ${key} (source: ${source})`);
      return undefined;
    }

    // Check if entry has expired
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      this.misses++;
      log(`EXPIRED: ${key} (source: ${source})`);
      return undefined;
    }

    this.hits++;
    return entry.value as T;
  }

  /**
   * Check if a key exists in the cache
   * @param key Cache key
   * @returns True if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if entry has expired
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get the age of a cache entry in milliseconds
   * @param key Cache key
   * @returns Age in milliseconds or undefined if not in cache
   */
  getAge(key: string): number | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check if entry has expired
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }

    return Date.now() - entry.created;
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param options Optional settings (TTL, tags, source)
   */
  set<T>(
    key: string,
    value: T,
    options?: {
      ttl?: number;
      tags?: string[];
      source?: string;
    },
  ): void {
    const ttl = options?.ttl || this.defaultTTL;
    const tags = options?.tags || [];
    const source = options?.source || 'unknown';

    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
      created: Date.now(),
      tags,
      source,
    });

    if (DEBUG) {
      log(`SET: ${key} (source: ${source})`);
    }
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  delete(key: string): boolean {
    const hadKey = this.cache.has(key);
    if (hadKey) {
      this.cache.delete(key);
      log(`DELETE: ${key}`);
    }
    return hadKey;
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    const count = this.cache.size;
    this.cache.clear();
    log(`CLEAR: Removed ${count} entries from cache`);

    // Reset stats
    this.hits = 0;
    this.misses = 0;
    this.totalRequests = 0;
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    let removedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      log(`CLEANUP: Removed ${removedCount} expired entries`);
    }
  }

  /**
   * Delete cache entries by pattern
   * @param pattern RegExp or string pattern to match against keys
   * @returns Number of entries removed
   */
  deletePattern(pattern: RegExp | string): number {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
    let count = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      log(`DELETE_PATTERN: Removed ${count} entries matching ${pattern}`);
    }

    return count;
  }

  /**
   * Delete cache entries by tag
   * @param tag Tag to match
   * @returns Number of entries removed
   */
  deleteByTag(tag: string): number {
    let count = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags?.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (count > 0) {
      log(`DELETE_TAG: Removed ${count} entries with tag "${tag}"`);
    }

    return count;
  }

  /**
   * Delete cache entries for a specific user
   * @param userId User ID
   * @returns Number of entries removed
   */
  deleteUserData(userId: string): number {
    return this.deletePattern(`user:${userId}`);
  }

  /**
   * Delete cache entries for a specific tenant
   * @param tenantId Tenant ID
   * @returns Number of entries removed
   */
  deleteTenantData(tenantId: string): number {
    return this.deletePattern(`tenant:${tenantId}`);
  }

  /**
   * Get cache statistics for monitoring
   * @returns Cache stats object
   */
  getStats(): CacheStats {
    let oldestTime: number | null = null;
    let newestTime: number | null = null;

    for (const entry of this.cache.values()) {
      const createTime = entry.created;

      if (oldestTime === null || createTime < oldestTime) {
        oldestTime = createTime;
      }

      if (newestTime === null || createTime > newestTime) {
        newestTime = createTime;
      }
    }

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      totalRequests: this.totalRequests,
      hitRate: this.totalRequests > 0 ? this.hits / this.totalRequests : 0,
      oldestEntry: oldestTime ? Date.now() - oldestTime : null,
      newestEntry: newestTime ? Date.now() - newestTime : null,
    };
  }

  /**
   * Get a value from cache or compute it if not found
   * @param key Cache key
   * @param fn Function to compute value if not in cache
   * @param options Optional settings (TTL, tags, source)
   * @returns Cached or computed value
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    options?: {
      ttl?: number;
      tags?: string[];
      source?: string;
      forceRefresh?: boolean;
    },
  ): Promise<T> {
    // Check if we should force a refresh
    if (!options?.forceRefresh) {
      const cachedValue = this.get<T>(key, { source: options?.source });
      if (cachedValue !== undefined) {
        return cachedValue;
      }
    } else {
      log(`FORCE_REFRESH: ${key} (source: ${options?.source || 'unknown'})`);
    }

    try {
      const start = Date.now();
      const value = await fn();
      const duration = Date.now() - start;

      this.set(key, value, {
        ttl: options?.ttl,
        tags: options?.tags,
        source: options?.source,
      });

      log(`COMPUTED: ${key} in ${duration}ms (source: ${options?.source || 'unknown'})`);
      return value;
    } catch (error) {
      log(`ERROR: Failed to compute value for ${key}`, error);
      throw error;
    }
  }

  /**
   * Creates a standardized cache key for user-specific data
   * @param userId User ID
   * @param action Action or data type identifier
   * @param suffix Additional identifier (optional)
   */
  userKey(userId: string, action: string, suffix?: string): string {
    return `user:${userId}:${action}${suffix ? `:${suffix}` : ''}`;
  }

  /**
   * Creates a standardized cache key for tenant-specific data
   * @param tenantId Tenant ID
   * @param action Action or data type identifier
   * @param suffix Additional identifier (optional)
   */
  tenantKey(tenantId: string, action: string, suffix?: string): string {
    return `tenant:${tenantId}:${action}${suffix ? `:${suffix}` : ''}`;
  }

  /**
   * Format milliseconds as a human-readable time string
   */
  private formatTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Format age for logging
   */
  private formatAge(ms: number): string {
    return this.formatTime(ms);
  }
}

// Export a singleton instance for use across the app
export const serverCache = new ServerCache();
