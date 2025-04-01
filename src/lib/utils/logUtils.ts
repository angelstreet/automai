/**
 * Logging utilities for the application
 */

export const logUtils = {
  /**
   * Log an information message
   * @param message The message to log
   * @param context Optional context object
   */
  info: (message: string, context?: Record<string, any>) => {
    if (context) {
      console.info(`[INFO] ${message}`, context);
    } else {
      console.info(`[INFO] ${message}`);
    }
  },

  /**
   * Log a debug message
   * @param message The message to log
   * @param context Optional context object
   */
  debug: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV !== 'production') {
      if (context) {
        console.debug(`[DEBUG] ${message}`, context);
      } else {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  },

  /**
   * Log a warning message
   * @param message The message to log
   * @param context Optional context object
   */
  warn: (message: string, context?: Record<string, any>) => {
    if (context) {
      console.warn(`[WARN] ${message}`, context);
    } else {
      console.warn(`[WARN] ${message}`);
    }
  },

  /**
   * Log an error message
   * @param message The message to log
   * @param error Optional error object
   * @param context Optional context object
   */
  error: (message: string, error?: Error | unknown, context?: Record<string, any>) => {
    if (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (context) {
        console.error(`[ERROR] ${message}: ${errorMessage}`, context);
      } else {
        console.error(`[ERROR] ${message}: ${errorMessage}`);
      }
    } else {
      if (context) {
        console.error(`[ERROR] ${message}`, context);
      } else {
        console.error(`[ERROR] ${message}`);
      }
    }
  }
};