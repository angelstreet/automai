// This file is kept for backwards compatibility
// All functionality is now in db-repository.ts

import { gitProvider } from './db-repository';

export { gitProvider, type GitProvider } from './db-repository';
export default gitProvider;
