import { HostContextType } from './host';
import { DeploymentContextType } from './deployment';
import { RepositoryContextType } from './repository';
import { CICDContextType } from './cicd';

/**
 * Root AppContext type that combines all other contexts
 */
export interface AppContextType {
  host: HostContextType;
  deployment: DeploymentContextType;
  repository: RepositoryContextType;
  cicd: CICDContextType;
} 