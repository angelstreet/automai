import { HostContextType } from './host';
import { DeploymentContextType } from './deployment';
import { RepositoryContextType } from './repository';
import { UserContextType } from './user';

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
