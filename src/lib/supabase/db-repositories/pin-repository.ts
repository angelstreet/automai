// This file is kept for backwards compatibility
// All functionality is now in db-repository.ts

import { pinRepository } from './db-repository';

export { pinRepository, type RepositoryPin } from './db-repository';
export default pinRepository;
