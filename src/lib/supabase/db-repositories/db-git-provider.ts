// DB Git Provider module
// Exports functions from db-repository.ts

import { gitProvider as repoGitProvider, type GitProvider } from './db-repository';

// Re-export types and functionality
export { type GitProvider } from './db-repository';
export const gitProvider = repoGitProvider;

// Default export for compatibility
export default repoGitProvider;
