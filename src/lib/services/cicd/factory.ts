import { CICDProvider, CICDProviderConfig } from '@/types-new/cicd-provider';
import { JenkinsProvider } from './jenkinsProvider';

/**
 * Factory class for creating CICD provider instances
 */
export class CICDProviderFactory {
  /**
   * Create a new CICD provider instance based on configuration
   */
  static createProvider(config: CICDProviderConfig): CICDProvider | null {
    console.log(`[@service:cicd:factory] Creating provider of type: ${config.type}`);

    try {
      switch (config.type.toLowerCase()) {
        case 'jenkins':
          return new JenkinsProvider(config);

        // Other providers will be added here
        case 'github':
        case 'gitlab':
        case 'circleci':
          console.warn(`[@service:cicd:factory] Provider type ${config.type} not yet implemented`);
          return null;

        default:
          console.error(`[@service:cicd:factory] Unknown provider type: ${config.type}`);
          return null;
      }
    } catch (error: any) {
      console.error(`[@service:cicd:factory] Error creating provider:`, error);
      return null;
    }
  }
}
