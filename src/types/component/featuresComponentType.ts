/**
 * Core feature and subscription plan types
 */

/**
 * Subscription plan types
 */
export type PlanType = 'TRIAL' | 'PRO' | 'ENTERPRISE';

/**
 * Features available for each plan type
 */
export interface PlanFeatures {
  maxProjects: number;
  maxUseCases: number;
  maxCampaigns: number;
  environments: ('web' | 'mobile' | 'desktop' | 'vision')[];
  teamManagement: boolean;
  multiTenant: boolean;
}