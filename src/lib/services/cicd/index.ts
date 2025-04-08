import { CICDProvider, CICDProviderConfig } from '@/types-new';

import { JenkinsProvider } from './jenkinsProvider';

// Export types
export type { CICDProvider, CICDProviderConfig, CICDResponse, CICDBuild } from '@/types-new';

// Export implementations
export { JenkinsProvider } from './jenkinsProvider';
export { generateJenkinsPipeline } from './jenkinsPipeline';

// Provider factory
export class CICDProviderFactory {
  static createProvider(config: CICDProviderConfig): CICDProvider | null {
    console.log(`[@service:cicd:factory] Creating provider of type: ${config.type}`);

    switch (config.type.toLowerCase()) {
      case 'jenkins':
        return new JenkinsProvider(config);

      default:
        console.error(`[@service:cicd:factory] Unsupported provider type: ${config.type}`);
        return null;
    }
  }
}
