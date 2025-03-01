/**
 * Logger utility for backend interactions
 * Provides consistent logging format and levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogOptions {
  userId?: string;
  tenantId?: string;
  ip?: string;
  action?: string;
  connectionId?: string;
  data?: Record<string, any>;
  pathname?: string;
  connectionType?: string;
  type?: string;
  error?: string | Error;
  path?: string;
  [key: string]: any; // Allow any additional properties
}

// Environment-based logging (more verbose in development)
const isDev = process.env.NODE_ENV === 'development';

// Helper to determine if we should log based on environment and level
function shouldLog(level: LogLevel): boolean {
  // Always log info and above
  return level !== 'debug';
}

/**
 * Log a message with metadata
 */
export function log(level: LogLevel, message: string, options: LogOptions = {}): void {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();
  const { userId, tenantId, ip, action, connectionId, data } = options;

  const logEntry = {
    timestamp,
    level,
    message,
    userId,
    tenantId,
    ip,
    action,
    connectionId,
    data,
  };

  // Use info level for all console logs
  console.info(JSON.stringify(logEntry));

  // Database logging has been removed
}

/**
 * Convenience methods for different log levels
 */
export const logger = {
  debug: (message: string, options?: LogOptions) => log('debug', message, options),
  info: (message: string, options?: LogOptions) => log('info', message, options),
  warn: (message: string, options?: LogOptions) => log('warn', message, options),
  error: (message: string, options?: LogOptions) => log('error', message, options),
};
