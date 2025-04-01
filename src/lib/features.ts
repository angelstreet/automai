import {  PlanType, PlanFeatures  } from '@/types/component/featuresComponentType';

// Re-export types for backward compatibility
export type { PlanType, PlanFeatures };

export const PLAN_FEATURES: Record<PlanType, PlanFeatures> = {
  TRIAL: {
    maxProjects: 1,
    maxUseCases: 5,
    maxCampaigns: 1,
    environments: ['web'],
    teamManagement: false,
    multiTenant: false,
  },
  PRO: {
    maxProjects: Infinity,
    maxUseCases: Infinity,
    maxCampaigns: Infinity,
    environments: ['web', 'mobile', 'desktop', 'vision'],
    teamManagement: false,
    multiTenant: false,
  },
  ENTERPRISE: {
    maxProjects: Infinity,
    maxUseCases: Infinity,
    maxCampaigns: Infinity,
    environments: ['web', 'mobile', 'desktop', 'vision'],
    teamManagement: true,
    multiTenant: true,
  },
};

export function getPlanFeatures(plan: PlanType): PlanFeatures {
  return PLAN_FEATURES[plan];
}

export function isFeatureEnabled(plan: PlanType, feature: keyof PlanFeatures): boolean {
  const features = PLAN_FEATURES[plan];
  const value = features[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

export function canCreateMore(
  plan: PlanType,
  feature: 'maxProjects' | 'maxUseCases' | 'maxCampaigns',
  currentCount: number,
): boolean {
  const limit = PLAN_FEATURES[plan][feature];
  return currentCount < limit;
}

export function getUpgradeMessage(plan: PlanType, feature: keyof PlanFeatures): string {
  const messages = {
    TRIAL: {
      maxProjects: 'Upgrade to Pro for unlimited projects',
      maxUseCases: 'Upgrade to Pro for unlimited test cases',
      maxCampaigns: 'Upgrade to Pro for unlimited campaigns',
      environments: 'Upgrade to Pro for access to all environments',
      teamManagement: 'Upgrade to Enterprise for team management',
      multiTenant: 'Upgrade to Enterprise for multi-tenant support',
    },
    PRO: {
      teamManagement: 'Upgrade to Enterprise for team management',
      multiTenant: 'Upgrade to Enterprise for multi-tenant support',
      maxProjects: '',
      maxUseCases: '',
      maxCampaigns: '',
      environments: '',
    },
    ENTERPRISE: {
      maxProjects: '',
      maxUseCases: '',
      maxCampaigns: '',
      environments: '',
      teamManagement: '',
      multiTenant: '',
    },
  };

  return messages[plan][feature] || '';
}
