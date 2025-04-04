/**
 * CICD Components
 *
 * Following optimal server/client architecture:
 * - Server components fetch data and pass to client
 * - Client components handle interactivity only
 * - Clear separation of responsibilities
 */

// Server Components
export { default as CICDContent } from './CICDContent';
export { default as CICDSkeleton } from './CICDSkeleton';

// Client Components
export { default as CICDTableClient } from './client/CICDTableClient';
export { default as CICDFormDialogClient } from './client/CICDFormDialogClient';
export { default as CICDActionsClient } from './client/CICDActionsClient';
