import { GitHubProvider } from './githubProvider';
import { JenkinsProvider } from './jenkinsProvider';
import { CICDProvider, CICDProviderConfig } from './types';

/**
 * Factory for creating CI/CD provider instances
 */
export class CICDProviderFactory {
  /**
   * Create a CI/CD provider instance based on the provider type
   */
  static createProvider(config: CICDProviderConfig): CICDProvider {
    console.log(`[@service:cicd:providerFactory] Creating provider for type: ${config.type}`);

    // Make sure we have the minimal required properties
    if (!config.type) {
      console.error('[@service:cicd:providerFactory] Provider type is undefined');
      throw new Error('Provider type is required');
    }

    // Ensure config has auth_type - default to token if not provided
    if (!config.auth_type) {
      console.log('[@service:cicd:providerFactory] auth_type not provided, using token as default');
      config.auth_type = 'token';
    }

    // Ensure credentials exists as an object even if empty
    if (!config.credentials) {
      console.log(
        '[@service:cicd:providerFactory] credentials not provided, initializing empty object',
      );
      config.credentials = {};
    }

    let provider: CICDProvider;

    try {
      switch (config.type.toLowerCase()) {
        case 'jenkins':
          provider = new JenkinsProvider();
          break;
        case 'github':
          provider = new GitHubProvider();
          break;
        default:
          throw new Error(`Unsupported CI/CD provider type: ${config.type}`);
      }

      // Initialize the provider with config
      provider.initialize(config);

      return provider;
    } catch (error) {
      console.error(`[@service:cicd:providerFactory] Error creating provider:`, error);
      throw error;
    }
  }

  /**
   * Get a provider instance based on provider config
   */
  static async getProvider(config: CICDProviderConfig): Promise<CICDProvider> {
    return this.createProvider(config);
  }
}
