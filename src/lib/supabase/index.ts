// Re-export everything from each file for convenient imports
export * as clientModule from './client';
export * as serverModule from './server';
export * as middlewareModule from './middleware';
export * as adminModule from './admin';
export * as envModule from './env';

// Also export the createClient functions directly for easier imports
export { createClient as createBrowserClient } from './client';
export { createClient as createServerClient } from './server';
export { createClient as createMiddlewareClient } from './middleware';
export { createClient as createAdminClient } from './admin';

// Export environment utility functions
export { 
  getSupabaseUrl, 
  getSupabaseAnonKey, 
  getSupabaseServiceKey,
  isCodespaceEnvironment,
  validateSupabaseEnv
} from './env';

// Default export the browser client for backwards compatibility
import { createClient } from './client';
export default { createClient };