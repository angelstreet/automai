/**
 * Session Utilities
 * Utilities for managing user sessions
 */
import { cookies } from 'next/headers';
import appConfig from '@/lib/config/appConfig';
import cacheUtils from '@/lib/utils/cacheUtils';
import logUtils from '@/lib/utils/logUtils';

// Create a logger for session utilities
const logger = logUtils.createModuleLogger('sessionUtils');

// Session-related constants
const SESSION_COOKIE_NAME = 'session';
const SESSION_CACHE_PREFIX = 'session:';
const SESSION_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

/**
 * Get session data from cookies
 */
export function getSessionFromCookies(): string | null {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    return sessionCookie?.value || null;
  } catch (error) {
    logger.error('Failed to get session from cookies', { error });
    return null;
  }
}

/**
 * Set session data in cookies
 */
export function setSessionCookie(sessionId: string, options?: { maxAge?: number; path?: string }): void {
  try {
    const cookieStore = cookies();
    
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      maxAge: options?.maxAge || SESSION_TTL,
      path: options?.path || '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
  } catch (error) {
    logger.error('Failed to set session cookie', { error });
  }
}

/**
 * Remove session cookie
 */
export function removeSessionCookie(): void {
  try {
    const cookieStore = cookies();
    
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      maxAge: 0,
      path: '/',
    });
  } catch (error) {
    logger.error('Failed to remove session cookie', { error });
  }
}

/**
 * Get cached session data
 */
export function getCachedSession<T>(sessionId: string): T | null {
  const cacheKey = `${SESSION_CACHE_PREFIX}${sessionId}`;
  return cacheUtils.getCachedItem<T>(cacheKey);
}

/**
 * Cache session data
 */
export function cacheSession<T>(sessionId: string, data: T, ttl: number = SESSION_TTL): void {
  const cacheKey = `${SESSION_CACHE_PREFIX}${sessionId}`;
  cacheUtils.cacheItem(cacheKey, data, ttl);
}

/**
 * Remove cached session data
 */
export function removeCachedSession(sessionId: string): void {
  const cacheKey = `${SESSION_CACHE_PREFIX}${sessionId}`;
  cacheUtils.removeCachedItem(cacheKey);
}

/**
 * Format session expiry date
 */
export function formatExpiryDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString(appConfig.LOCALE.defaultLocale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/**
 * Check if a session has expired
 */
export function isSessionExpired(expiryTimestamp: number): boolean {
  return Date.now() > expiryTimestamp;
}

/**
 * Calculate time until session expiry
 */
export function timeUntilExpiry(expiryTimestamp: number): {
  expired: boolean;
  days: number;
  hours: number;
  minutes: number;
} {
  const now = Date.now();
  const expiryTime = expiryTimestamp;
  
  if (now >= expiryTime) {
    return {
      expired: true,
      days: 0,
      hours: 0,
      minutes: 0,
    };
  }
  
  const diff = expiryTime - now;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return {
    expired: false,
    days,
    hours,
    minutes,
  };
}

// Export session utility functions
const sessionUtils = {
  getSessionFromCookies,
  setSessionCookie,
  removeSessionCookie,
  getCachedSession,
  cacheSession,
  removeCachedSession,
  formatExpiryDate,
  isSessionExpired,
  timeUntilExpiry,
};

export default sessionUtils;