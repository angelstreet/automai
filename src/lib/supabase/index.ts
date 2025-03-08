// Re-export everything from each file for convenient imports
export * as clientModule from './client';
export * as serverModule from './server';
export * as middlewareModule from './middleware';
export * as adminModule from './admin';

// Export the client creation functions directly
export { createClient } from './client';
export { createClient as createBrowserClient } from './client';
export { createClient as createServerClient } from './server';
export { createClient as createMiddlewareClient } from './middleware';
export { createClient as createAdminClient } from './admin';
