'use server';

import { revalidatePath } from 'next/cache';

import { getCICDProviders } from '@/app/actions/cicdAction';
import { getHosts } from '@/app/actions/hostsAction';
import { getRepositories } from '@/app/actions/repositoriesAction';
import { getUser } from '@/app/actions/userAction';
import type { DeploymentFormData } from '@/types/component/deploymentComponentType';

/**
 * Fetches all data needed for the deployment wizard
 */
export async function getDeploymentWizardData() {
  try {
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
    console.error('Error fetching deployment wizard data:', error);
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
    // Validate required fields
    if (!formData.name || !formData.repositoryId) {
      return {
        success: false,
        error: 'Missing required fields',
      };
    }

    // Import the deployment database operations
    const deploymentDb = await import('@/lib/db/deploymentDb');

    // Prepare deployment data
    const deploymentData = {
      name: formData.name,
      description: formData.description || '',
      repository_id: formData.repositoryId,
      target_host_id: formData.targetHostId,
      script_path: formData.scriptPath || '',
      cicd_provider_id: formData.cicdProviderId,
      configuration: formData.configuration || {},
      status: 'pending',
      scheduled: formData.scheduled || false,
      schedule: formData.schedule || null,
    };

    // Create the deployment
    const result = await deploymentDb.default.createDeployment({
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
    console.error('Error saving deployment configuration:', error);
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
    const deploymentDb = await import('@/lib/db/deploymentDb');

    // Update deployment status
    const result = await deploymentDb.default.updateDeployment({
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
    console.error('Error starting deployment:', error);
    return {
      success: false,
      error: error.message || 'Failed to start deployment',
    };
  }
}
