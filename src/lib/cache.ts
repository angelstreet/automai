/**
 * A simple server-side caching utility for Next.js
 * Provides in-memory caching for data fetching operations
 */

type CacheEntry<T> = {
  value: T;
  expiry: number;
};

class ServerCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  // Default TTL 5 minutes
  private defaultTTL = 5 * 60 * 1000;

  constructor() {
    // Setup periodic cleanup of expired entries
    if (typeof window === 'undefined') {
      setInterval(() => this.cleanup(), 60 * 1000); // Every minute
    }
  }

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or undefined if not found or expired
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }
    
    // Check if entry has expired
    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value as T;
  }

  /**
   * Set a value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, value: T, ttl = this.defaultTTL): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  /**
   * Delete a value from cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries from cache
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get a value from cache or compute it if not found
   * @param key Cache key
   * @param fn Function to compute value if not in cache
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   * @returns Cached or computed value
   */
  async getOrSet<T>(
    key: string,
    fn: () => Promise<T>,
    ttl = this.defaultTTL
  ): Promise<T> {
    const cachedValue = this.get<T>(key);
    
    if (cachedValue !== undefined) {
      return cachedValue;
    }
    
    const value = await fn();
    this.set(key, value, ttl);
    return value;
  }
}

// Export a singleton instance for use across the app
export const serverCache = new ServerCache(); 