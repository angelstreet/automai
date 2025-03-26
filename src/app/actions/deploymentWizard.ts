'use server';

import { revalidatePath } from 'next/cache';
import { getRepositories } from './repositories';
import { getHosts } from './hosts';
import { getCICDProviders } from './cicd';
import { AuthUser } from '@/types/user';
import { getUser } from './user';
import { logger } from '@/lib/logger';
import type { DeploymentFormData } from '@/app/[locale]/[tenant]/deployment/types';

/**
 * Fetches all data needed for the deployment wizard
 */
export async function getDeploymentWizardData() {
  try {
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
        repositories: [],
        hosts: [],
        cicdProviders: [],
      };
    }

    // Fetch all required data in parallel
    const [repositoriesResult, hostsResult, cicdProvidersResult] = await Promise.all([
      getRepositories(),
      getHosts(),
      getCICDProviders(),
    ]);

    return {
      success: true,
      repositories: repositoriesResult.success ? repositoriesResult.data || [] : [],
      hosts: hostsResult.success ? hostsResult.data || [] : [],
      cicdProviders: cicdProvidersResult.success ? cicdProvidersResult.data || [] : [],
    };
  } catch (error: any) {
    logger.error('Error fetching deployment wizard data:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch deployment data',
      repositories: [],
      hosts: [],
      cicdProviders: [],
    };
  }
}

/**
 * Saves a deployment configuration
 */
export async function saveDeploymentConfiguration(formData: DeploymentFormData) {
  try {
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Validate required fields
    if (!formData.name || !formData.repositoryId) {
      return {
        success: false,
        error: 'Missing required fields',
      };
    }

    // Import the deployment database operations
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');

    // Prepare deployment data
    const deploymentData = {
      name: formData.name,
      description: formData.description || '',
      repository_id: formData.repositoryId,
      target_host_id: formData.targetHostId,
      script_path: formData.scriptPath || '',
      cicd_provider_id: formData.cicdProviderId,
      tenant_id: user.tenant_id,
      created_by: user.id,
      configuration: formData.configuration || {},
      status: 'pending',
      scheduled: formData.scheduled || false,
      schedule: formData.schedule || null,
    };

    // Create the deployment
    const result = await deploymentDb.createDeployment({
      data: deploymentData,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to create deployment',
      };
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');
    revalidatePath('/[locale]/[tenant]/dashboard');

    return {
      success: true,
      data: result.data,
    };
  } catch (error: any) {
    logger.error('Error saving deployment configuration:', error);
    return {
      success: false,
      error: error.message || 'Failed to save deployment configuration',
    };
  }
}

/**
 * Starts a deployment
 */
export async function startDeployment(deploymentId: string) {
  try {
    // Get current user for auth checks
    const user = await getUser();
    if (!user) {
      return {
        success: false,
        error: 'Unauthorized',
      };
    }

    // Import the deployment database operations
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');

    // Update deployment status
    const result = await deploymentDb.updateDeployment({
      where: { id: deploymentId },
      data: { status: 'running', started_at: new Date().toISOString() },
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to start deployment',
      };
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/deployment');
    revalidatePath(`/[locale]/[tenant]/deployment/${deploymentId}`);

    return {
      success: true,
      data: result.data,
    };
  } catch (error: any) {
    logger.error('Error starting deployment:', error);
    return {
      success: false,
      error: error.message || 'Failed to start deployment',
    };
  }
}
