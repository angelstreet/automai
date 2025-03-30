// This file is kept for backwards compatibility
// All functionality is now in db-repository.ts

import { repository } from './db-repository';

export { repository, type Repository } from './db-repository';
export default repository;
