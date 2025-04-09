import { CICDJobConfig, CreateCICDJobParams } from '@/types-new/cicd-job';
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

  /**
   * Generate pipeline configuration based on provider type
   */
  static async generatePipeline(providerType: string, params: CreateCICDJobParams): Promise<CICDJobConfig> {
    console.log(`[@service:cicd:factory] Generating pipeline for provider type: ${providerType}`);

    try {
      switch (providerType.toLowerCase()) {
        case 'jenkins':
          const { generateJenkinsPipeline } = await import('./jenkinsPipeline');
          return generateJenkinsPipeline(params);
        
        // Future pipeline generators will be added here
        case 'github':
        case 'gitlab':
        case 'circleci':
          console.warn(`[@service:cicd:factory] Pipeline generation for ${providerType} not yet implemented, using Jenkins as fallback`);
          const { generateJenkinsPipeline: jenkinsGen } = await import('./jenkinsPipeline');
          return jenkinsGen(params);
          
        default:
          console.warn(`[@service:cicd:factory] Unknown provider type for pipeline generation: ${providerType}, using Jenkins as fallback`);
          const { generateJenkinsPipeline: defaultGen } = await import('./jenkinsPipeline');
          return defaultGen(params);
      }
    } catch (error: any) {
      console.error(`[@service:cicd:factory] Error generating pipeline:`, error);
      // Return an empty pipeline as fallback
      return {
        name: params.name,
        description: params.description || '',
        pipeline: '// Failed to generate pipeline',
        parameters: []
      };
    }
  }
}
