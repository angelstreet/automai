import { UserContextType } from '../user';

import { DeploymentContextType } from './deployment';
import { HostContextType } from './host';
import { RepositoryContextType } from './repository';

/**
 * Root AppContext type that combines all other contexts
 * Each context can be null if not yet initialized
 */
export interface AppContextType {
  host: HostContextType | null;
  deployment: DeploymentContextType | null;
  repository: RepositoryContextType | null;
  user: UserContextType | null;
}
