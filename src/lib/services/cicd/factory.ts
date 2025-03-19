import { CICDProvider, CICDProviderConfig } from './interfaces';
import { JenkinsProvider } from './jenkins';

/**
 * Factory for creating CI/CD provider instances
 */
export class CICDProviderFactory {
  /**
   * Create a CI/CD provider instance based on the provider type
   */
  static createProvider(config: CICDProviderConfig): CICDProvider {
    let provider: CICDProvider;
    
    switch (config.type.toLowerCase()) {
      case 'jenkins':
        provider = new JenkinsProvider();
        break;
      default:
        throw new Error(`Unsupported CI/CD provider type: ${config.type}`);
    }
    
    // Initialize the provider with config
    provider.initialize(config);
    
    return provider;
  }

  /**
   * Get a provider instance based on provider config
   */
  static async getProvider(config: CICDProviderConfig): Promise<CICDProvider> {
    return this.createProvider(config);
  }
}