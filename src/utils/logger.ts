/**
 * Simple logger utility for client-side context components
 * Simplified version of the server-side logger in src/lib/logger.ts
 */

import type { LogLevel } from '@/types/logger';

/**
 * Log a message with optional error data
 */
export function log(message: string, error?: any): void {
  if (typeof window === 'undefined') {
    // Server-side logging
    console.info(message, error ? error : '');
  } else {
    // Client-side logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.info(message, error ? error : '');
    }
  }
}
