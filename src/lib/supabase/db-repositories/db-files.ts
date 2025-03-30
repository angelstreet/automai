// DB Files module
// Exports functions from db-repository.ts

import { files as repositoryFiles } from './db-repository';

// Re-export the main implementation
export const files = repositoryFiles;

// Default export for compatibility
export default repositoryFiles;
