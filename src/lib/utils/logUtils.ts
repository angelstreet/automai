/**
 * Logging Utilities
 * Provides a consistent logging interface for the application
 */
import envConfig from '@/lib/config/envConfig';

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log options
 */
export interface LogOptions {
  level?: LogLevel;
  module?: string;
  context?: Record<string, any>;
  timestamp?: boolean;
}

/**
 * Default log options
 */
const DEFAULT_OPTIONS: LogOptions = {
  level: LogLevel.INFO,
  module: 'app',
  timestamp: true,
};

/**
 * Logger class
 */
class Logger {
  private minLevel: LogLevel;
  
  constructor() {
    // In production, only log INFO and above
    // In development, log everything
    this.minLevel = envConfig.isDevelopment() ? LogLevel.DEBUG : LogLevel.INFO;
  }
  
  /**
   * Set the minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
  
  /**
   * Check if a log level is enabled
   */
  isLevelEnabled(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const minLevelIndex = levels.indexOf(this.minLevel);
    const levelIndex = levels.indexOf(level);
    
    return levelIndex >= minLevelIndex;
  }
  
  /**
   * Format a log message
   */
  private formatMessage(message: string, options: LogOptions): string {
    const parts = [];
    
    // Add timestamp if enabled
    if (options.timestamp) {
      parts.push(new Date().toISOString());
    }
    
    // Add log level
    parts.push(`[${options.level?.toUpperCase()}]`);
    
    // Add module name if provided
    if (options.module) {
      parts.push(`[${options.module}]`);
    }
    
    // Add message
    parts.push(message);
    
    // Format context if provided
    if (options.context) {
      try {
        const contextStr = JSON.stringify(options.context);
        parts.push(contextStr);
      } catch (error) {
        parts.push(`[Context: ${String(error)}]`);
      }
    }
    
    return parts.join(' ');
  }
  
  /**
   * Log a message
   */
  log(message: string, options: LogOptions = {}): void {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    
    if (!this.isLevelEnabled(mergedOptions.level || LogLevel.INFO)) {
      return;
    }
    
    const formattedMessage = this.formatMessage(message, mergedOptions);
    
    switch (mergedOptions.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  }
  
  /**
   * Log a debug message
   */
  debug(message: string, context?: Record<string, any>, module?: string): void {
    this.log(message, {
      level: LogLevel.DEBUG,
      context,
      module,
    });
  }
  
  /**
   * Log an info message
   */
  info(message: string, context?: Record<string, any>, module?: string): void {
    this.log(message, {
      level: LogLevel.INFO,
      context,
      module,
    });
  }
  
  /**
   * Log a warning message
   */
  warn(message: string, context?: Record<string, any>, module?: string): void {
    this.log(message, {
      level: LogLevel.WARN,
      context,
      module,
    });
  }
  
  /**
   * Log an error message
   */
  error(message: string, context?: Record<string, any>, module?: string): void {
    this.log(message, {
      level: LogLevel.ERROR,
      context,
      module,
    });
  }
  
  /**
   * Create a module-specific logger
   */
  createModuleLogger(module: string): {
    debug: (message: string, context?: Record<string, any>) => void;
    info: (message: string, context?: Record<string, any>) => void;
    warn: (message: string, context?: Record<string, any>) => void;
    error: (message: string, context?: Record<string, any>) => void;
  } {
    return {
      debug: (message, context) => this.debug(message, context, module),
      info: (message, context) => this.info(message, context, module),
      warn: (message, context) => this.warn(message, context, module),
      error: (message, context) => this.error(message, context, module),
    };
  }
}

// Create a singleton logger instance
const logger = new Logger();

// Export log utilities
const logUtils = {
  LogLevel,
  logger,
  setMinLevel: (level: LogLevel) => logger.setMinLevel(level),
  debug: (message: string, context?: Record<string, any>, module?: string) => logger.debug(message, context, module),
  info: (message: string, context?: Record<string, any>, module?: string) => logger.info(message, context, module),
  warn: (message: string, context?: Record<string, any>, module?: string) => logger.warn(message, context, module),
  error: (message: string, context?: Record<string, any>, module?: string) => logger.error(message, context, module),
  createModuleLogger: (module: string) => logger.createModuleLogger(module),
};

export default logUtils;