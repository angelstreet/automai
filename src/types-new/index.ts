/**
 * Main types export file
 * Re-exports commonly used types from their specific locations
 *
 * IMPORTANT: For most cases, prefer importing directly from the specific type file
 * This file is primarily for convenience in cases where you need many entity types
 */

/**
 * Types index file for convenient imports
 * For most cases, import directly from specific type files
 * Use this file when importing multiple entity types
 */

// ----------------------------------------------------------------------------
// Base and Utility Types
// ----------------------------------------------------------------------------
export * from './base-types';

// ----------------------------------------------------------------------------
// Core Entity Types
// ----------------------------------------------------------------------------

// Host types
export * from './host-types';

// Repository types
export * from './repository-types';

// Deployment types
export * from './deployment-types';

// User types
export * from './user-types';

// Team types
export * from './team-types';

// ----------------------------------------------------------------------------
// Dashboard Context Types (for convenience)
// ----------------------------------------------------------------------------
export * from './dashboard-context';

// ----------------------------------------------------------------------------
// Common Database Types
// ----------------------------------------------------------------------------

// Common DB types
export * from './db-common';

// Database Tables
export * from './db-hosts';
export * from './db-auth';
export * from './db-git';
export * from './db-teams';
export * from './db-deployments';

/**
 * @example
 * // Prefer importing from specific files
 * import { Host, HostStatus } from '@/types-new/host-types';
 *
 * // Use index imports only when needing multiple entity types
 * import { Host, Repository, Deployment } from '@/types-new';
 *
 * // Always import context types directly
 * import { DashboardContext } from '@/types-new/dashboard-context';
 */
