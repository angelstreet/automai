/**
 * Logger utility for backend interactions
 * Provides consistent logging format and levels
 */

import { prisma } from './prisma';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogOptions {
  userId?: string;
  tenantId?: string;
  ip?: string;
  action?: string;
  connectionId?: string;
  data?: Record<string, any>;
  saveToDb?: boolean; // Flag to determine if log should be saved to database
}

// Environment-based logging (more verbose in development)
const isDev = process.env.NODE_ENV === 'development';

// Debounce mechanism to prevent duplicate logs
const recentLogs = new Map<string, number>();
const DEBOUNCE_INTERVAL = 2000; // 2 seconds

// Helper to determine if we should log based on environment and level
function shouldLog(level: LogLevel): boolean {
  // Always log info and above
  return level !== 'debug';
}

// Generate a unique key for a log entry to prevent duplicates
function getLogKey(level: LogLevel, message: string, options: LogOptions): string {
  const { userId, connectionId, action } = options;
  return `${level}:${message}:${userId || ''}:${connectionId || ''}:${action || ''}`;
}

/**
 * Log a message with metadata
 */
export async function log(level: LogLevel, message: string, options: LogOptions = {}): Promise<void> {
  if (!shouldLog(level)) return;

  const timestamp = new Date().toISOString();
  const { userId, tenantId, ip, action, connectionId, data, saveToDb = false } = options;
  
  const logEntry = {
    timestamp,
    level,
    message,
    userId,
    tenantId,
    ip,
    action,
    connectionId,
    data
  };
  
  // Use info level for all console logs
  console.info(JSON.stringify(logEntry));
  
  // Save to database if requested and not in test environment
  if (saveToDb && process.env.NODE_ENV !== 'test') {
    try {
      // Check for duplicate logs within debounce interval
      const logKey = getLogKey(level, message, options);
      const now = Date.now();
      const lastLogTime = recentLogs.get(logKey);
      
      if (lastLogTime && now - lastLogTime < DEBOUNCE_INTERVAL) {
        // Skip duplicate log within debounce interval
        return;
      }
      
      // Update the last log time
      recentLogs.set(logKey, now);
      
      // Clean up old entries from the map to prevent memory leaks
      if (recentLogs.size > 1000) {
        const keysToDelete = [];
        for (const [key, time] of recentLogs.entries()) {
          if (now - time > DEBOUNCE_INTERVAL) {
            keysToDelete.push(key);
          }
        }
        keysToDelete.forEach(key => recentLogs.delete(key));
      }
      
      // Check if ConnectionLog model exists in the schema
      if (prisma.connectionLog) {
        // Create log data object
        const logData: any = {
          level,
          message,
          action,
          ip,
          metadata: data ? JSON.stringify(data) : null,
        };
        
        // Only include foreign keys if they exist
        if (userId) {
          // Check if user exists
          const userExists = await prisma.user.findUnique({ where: { id: userId } });
          if (userExists) {
            logData.userId = userId;
          }
        }
        
        if (tenantId) {
          // Check if tenant exists
          const tenantExists = await prisma.tenant.findUnique({ where: { id: tenantId } });
          if (tenantExists) {
            logData.tenantId = tenantId;
          }
        }
        
        if (connectionId) {
          // Check if connection exists
          const connectionExists = await prisma.connection.findUnique({ where: { id: connectionId } });
          if (connectionExists) {
            logData.connectionId = connectionId;
          }
        }
        
        await prisma.connectionLog.create({
          data: logData
        });
      } else {
        console.warn('ConnectionLog model not found in schema, skipping database logging');
      }
    } catch (error) {
      // Don't let database errors affect the application
      console.error('Failed to save log to database:', error);
    }
  }
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