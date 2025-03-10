/**
 * Available log levels
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Options for log entries
 */
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

/**
 * Logger interface for consistent logging
 */
export interface Logger {
  debug: (message: string, options?: LogOptions) => void;
  info: (message: string, options?: LogOptions) => void;
  warn: (message: string, options?: LogOptions) => void;
  error: (message: string, options?: LogOptions) => void;
}