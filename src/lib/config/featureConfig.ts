/**
 * Feature Configuration
 * Configuration for feature flags and feature options
 */

/**
 * Interface for feature flags
 */
export interface FeatureFlags {
  enableCICD: boolean;
  enableDeployments: boolean;
  enableHostManagement: boolean;
  enableRepositorySync: boolean;
  enableTeams: boolean;
  enableRBAC: boolean;
  enableMetrics: boolean;
  enableDarkMode: boolean;
  enableTranslations: boolean;
}

/**
 * Default feature flags
 */
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableCICD: true,
  enableDeployments: true,
  enableHostManagement: true,
  enableRepositorySync: true,
  enableTeams: true,
  enableRBAC: true,
  enableMetrics: true,
  enableDarkMode: true,
  enableTranslations: true,
};

/**
 * Interface for plan features
 */
export interface PlanFeatures {
  maxUsers: number;
  maxRepositories: number;
  maxHosts: number;
  maxDeployments: number;
  enableAdvancedMetrics: boolean;
  enableCustomization: boolean;
  enablePrioritySupportSLA: boolean;
}

/**
 * Default plan features by plan
 */
export const PLAN_FEATURES: Record<string, PlanFeatures> = {
  free: {
    maxUsers: 3,
    maxRepositories: 5,
    maxHosts: 3,
    maxDeployments: 10,
    enableAdvancedMetrics: false,
    enableCustomization: false,
    enablePrioritySupportSLA: false,
  },
  pro: {
    maxUsers: 10,
    maxRepositories: 20,
    maxHosts: 10,
    maxDeployments: 100,
    enableAdvancedMetrics: true,
    enableCustomization: true,
    enablePrioritySupportSLA: false,
  },
  enterprise: {
    maxUsers: 100,
    maxRepositories: 200,
    maxHosts: 100,
    maxDeployments: 1000,
    enableAdvancedMetrics: true,
    enableCustomization: true,
    enablePrioritySupportSLA: true,
  },
};

/**
 * Get feature flags
 */
export function getFeatureFlags(): FeatureFlags {
  // In a real implementation, this might fetch from an API or database
  return DEFAULT_FEATURE_FLAGS;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  const flags = getFeatureFlags();
  return flags[feature] || false;
}

/**
 * Get features for a specific plan
 */
export function getPlanFeatures(planName: string): PlanFeatures {
  return PLAN_FEATURES[planName] || PLAN_FEATURES.free;
}

// Export feature configuration
const featureConfig = {
  DEFAULT_FEATURE_FLAGS,
  PLAN_FEATURES,
  getFeatureFlags,
  isFeatureEnabled,
  getPlanFeatures,
};

export default featureConfig;