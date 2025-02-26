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

// Cache for entity existence checks to reduce database queries
const entityCache = {
  users: new Map<string, boolean>(),
  tenants: new Map<string, boolean>(),
  connections: new Map<string, boolean>(),
  // Clear cache periodically to prevent stale data
  clearInterval: null as NodeJS.Timeout | null,
  
  // Initialize cache clearing
  init() {
    if (this.clearInterval === null) {
      // Clear cache every 5 minutes
      this.clearInterval = setInterval(() => {
        this.users.clear();
        this.tenants.clear();
        this.connections.clear();
      }, 5 * 60 * 1000);
      
      // Ensure the interval is cleared when the process exits
      process.on('beforeExit', () => {
        if (this.clearInterval) {
          clearInterval(this.clearInterval);
          this.clearInterval = null;
        }
      });
    }
  }
};

// Initialize entity cache
entityCache.init();

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

// Check if an entity exists, using cache to reduce database queries
async function entityExists(type: 'user' | 'tenant' | 'connection', id: string): Promise<boolean> {
  const cacheMap = type === 'user' ? entityCache.users : 
                  type === 'tenant' ? entityCache.tenants : 
                  entityCache.connections;
  
  // Check cache first
  if (cacheMap.has(id)) {
    return cacheMap.get(id) as boolean;
  }
  
  try {
    let exists = false;
    
    // Check database
    if (type === 'user') {
      exists = !!(await prisma.user.findUnique({ where: { id }, select: { id: true } }));
    } else if (type === 'tenant') {
      exists = !!(await prisma.tenant.findUnique({ where: { id }, select: { id: true } }));
    } else if (type === 'connection') {
      exists = !!(await prisma.connection.findUnique({ where: { id }, select: { id: true } }));
    }
    
    // Cache result
    cacheMap.set(id, exists);
    return exists;
  } catch (error) {
    // In case of error, assume entity exists to avoid data loss
    return true;
  }
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
        
        // Only include foreign keys if they exist - use cached checks
        if (userId && await entityExists('user', userId)) {
          logData.userId = userId;
        }
        
        if (tenantId && await entityExists('tenant', tenantId)) {
          logData.tenantId = tenantId;
        }
        
        if (connectionId && await entityExists('connection', connectionId)) {
          logData.connectionId = connectionId;
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