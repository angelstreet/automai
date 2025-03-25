/**
 * DEPRECATED: This cache implementation has been replaced by SWR client-side caching
 * 
 * This file will be removed in a future release.
 * 
 * New implementations should leverage SWR's built-in caching capabilities instead.
 */

const MESSAGE = "This cache module is deprecated. Use SWR client-side caching instead.";

// Create non-functional stubs of the original API to satisfy imports during migration
class ServerCacheStub {
  get() {
    console.warn(MESSAGE);
    return undefined;
  }

  set() {
    console.warn(MESSAGE);
    return;
  }

  getOrSet(key: string, fn: () => Promise<any>) {
    console.warn(MESSAGE);
    return fn();
  }

  delete() {
    console.warn(MESSAGE);
    return false;
  }

  deleteByTag() {
    console.warn(MESSAGE);
    return 0;
  }

  deletePattern() {
    console.warn(MESSAGE);
    return 0;
  }

  deleteUserData() {
    console.warn(MESSAGE);
    return 0;
  }

  deleteTenantData() {
    console.warn(MESSAGE);
    return 0;
  }

  clear() {
    console.warn(MESSAGE);
  }

  getStats() {
    console.warn(MESSAGE);
    return {
      size: 0,
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      oldestEntry: null,
      newestEntry: null
    };
  }

  userKey(userId: string, action: string, suffix?: string): string {
    console.warn(MESSAGE);
    return `user:${userId}:${action}${suffix ? `:${suffix}` : ''}`;
  }

  tenantKey(tenantId: string, action: string, suffix?: string): string {
    console.warn(MESSAGE);
    return `tenant:${tenantId}:${action}${suffix ? `:${suffix}` : ''}`;
  }
}

// Export a singleton instance for backward compatibility
export const serverCache = new ServerCacheStub();