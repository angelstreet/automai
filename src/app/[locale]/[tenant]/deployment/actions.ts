'use server';

import { revalidatePath } from 'next/cache';
import { AuthUser } from '@/types/user';
import { Deployment, DeploymentFormData, DeploymentStatus } from './types';

/**
 * Get all deployments for the current user
 * @param user The authenticated user
 * @returns Array of deployments
 */
export async function getDeployments(user: AuthUser | null): Promise<Deployment[]> {
  try {
    // TODO: Implement actual API call to fetch deployments
    // This is a stub implementation
    return [];
  } catch (error) {
    console.error('Error fetching deployments:', error);
    throw new Error('Failed to fetch deployments');
  }
}

/**
 * Get a specific deployment by ID
 * @param id Deployment ID
 * @param user The authenticated user
 * @returns Deployment object or null if not found
 */
export async function getDeploymentById(id: string, user: AuthUser | null): Promise<Deployment | null> {
  try {
    // TODO: Implement actual API call to fetch deployment by ID
    // This is a stub implementation
    return null;
  } catch (error) {
    console.error(`Error fetching deployment ${id}:`, error);
    throw new Error('Failed to fetch deployment');
  }
}

/**
 * Create a new deployment
 * @param formData Deployment form data
 * @param user The authenticated user
 * @returns Object with success status and optional deployment ID
 */
export async function createDeployment(
  formData: DeploymentFormData,
  user: AuthUser | null
): Promise<{ success: boolean; deploymentId?: string; error?: string }> {
  try {
    console.log('Actions layer: Creating deployment with form data:', JSON.stringify({
      name: formData.name,
      description: formData.description,
      repository: formData.repository,
      selectedScripts: formData.selectedScripts?.length,
      selectedHosts: formData.selectedHosts?.length,
      schedule: formData.schedule,
      jenkinsEnabled: formData.jenkinsConfig?.enabled
    }));

    if (!user) {
      console.error('Actions layer: Cannot create deployment - user not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    // Import the deployment and CICD database modules
    const { default: deploymentDb } = await import('@/lib/supabase/db-deployment/deployment');
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');

    // Extract script paths and parameters from the scriptMapping
    const scriptPaths: string[] = [];
    const scriptParameters: string[] = [];
    
    if (formData.scriptMapping) {
      Object.entries(formData.scriptMapping).forEach(([scriptId, scriptInfo]) => {
        if (scriptInfo && scriptInfo.path) {
          scriptPaths.push(scriptInfo.path);
          
          // Store parameters for this script path if they exist
          if (formData.parameters && formData.parameters[scriptId]) {
            // Convert parameters to a string and add to the array
            scriptParameters.push(JSON.stringify(formData.parameters[scriptId]));
          } else {
            // Add an empty string if no parameters
            scriptParameters.push('');
          }
        }
      });
    }

    console.log('Actions layer: Script paths:', scriptPaths);
    console.log('Actions layer: Script parameters:', scriptParameters);

    // Check if the selected hosts are valid UUIDs
    const isValidUUID = (id: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return uuidRegex.test(id);
    };
    
    const validHostIds = formData.selectedHosts?.filter(id => {
      const isValid = isValidUUID(id);
      if (!isValid) {
        console.warn(`Actions layer: Filtering out invalid host ID: ${id}`);
      }
      return isValid;
    }) || [];

    console.log('Actions layer: Valid host IDs:', validHostIds);

    // Map form data to database schema
    const deploymentData = {
      name: formData.name,
      description: formData.description || '',
      repository_id: formData.repository,
      scripts_paths: scriptPaths,
      scripts_parameters: scriptParameters,
      host_ids: validHostIds,
      status: 'pending',
      schedule_type: formData.schedule,
      scheduled_time: formData.scheduledTime || null,
      cron_expression: formData.cronExpression || null,
      repeat_count: formData.repeatCount || 0,
      environment_vars: formData.environmentVars || [], 
      tenant_id: user.tenant_id,
      user_id: user.id
    };

    console.log('Actions layer: Final deployment data:', JSON.stringify(deploymentData, null, 2));
    console.log('Actions layer: Calling deployment.create with data');
    
    // Create the deployment in the database
    const result = await deploymentDb.create({ data: deploymentData });

    if (!result.success) {
      console.error('Error creating deployment:', result.error);
      
      // Provide more specific error messages based on the error type
      if (result.error?.code === '22P02') {
        return { 
          success: false, 
          error: 'Invalid data type for one or more fields. Please ensure all IDs are valid UUIDs.' 
        };
      }
      
      return { success: false, error: result.error?.message || 'Failed to create deployment' };
    }

    console.log('Actions layer: Deployment created with ID:', result.id);

    // If Jenkins integration is enabled, create the CICD mapping
    if (formData.jenkinsConfig?.enabled && 
        formData.jenkinsConfig.providerId && 
        formData.jenkinsConfig.jobId) {
      
      console.log('Actions layer: Jenkins integration enabled, creating CICD mapping');
      
      const cicdMappingData = {
        deployment_id: result.id,
        provider_id: formData.jenkinsConfig.providerId,
        job_id: formData.jenkinsConfig.jobId,
        tenant_id: user.tenant_id,
        parameters: formData.jenkinsConfig.parameters || {}
      };
      
      console.log('Actions layer: Calling createDeploymentCICDMapping with data:', JSON.stringify({
        deployment_id: cicdMappingData.deployment_id,
        provider_id: cicdMappingData.provider_id,
        job_id: cicdMappingData.job_id,
        tenant_id: cicdMappingData.tenant_id,
        parameters: Object.keys(cicdMappingData.parameters || {})
      }));
      
      const cicdResult = await cicdDb.createDeploymentCICDMapping(cicdMappingData);
      
      if (!cicdResult.success) {
        console.error('Actions layer: Failed to create CICD mapping:', cicdResult.error);
        // We don't fail the whole deployment if CICD mapping fails
        // Just log the error and continue
      } else {
        console.log('Actions layer: CICD mapping created successfully');
      }
    }

    // Revalidate the deployments list
    revalidatePath('/[locale]/[tenant]/deployment');
    
    return { 
      success: true, 
      deploymentId: result.id 
    };
  } catch (error) {
    console.error('Error creating deployment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to create deployment' };
  }
}

/**
 * Abort a running deployment
 * @param id Deployment ID
 * @returns Object with success status
 */
export async function abortDeployment(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: Implement actual API call to abort deployment
    // This is a stub implementation
    return { success: true };
  } catch (error) {
    console.error(`Error aborting deployment ${id}:`, error);
    return { success: false, error: 'Failed to abort deployment' };
  }
}

/**
 * Refresh deployment data
 * @param id Deployment ID
 * @returns Object with success status and optional updated deployment
 */
export async function refreshDeployment(
  id: string
): Promise<{ success: boolean; deployment?: Deployment; error?: string }> {
  try {
    // TODO: Implement actual API call to refresh deployment
    // This is a stub implementation
    return { success: true };
  } catch (error) {
    console.error(`Error refreshing deployment ${id}:`, error);
    return { success: false, error: 'Failed to refresh deployment' };
  }
}

/**
 * Get scripts available for a repository
 * @param repositoryId Repository ID
 * @returns Array of scripts
 */
export async function getScriptsForRepository(repositoryId: string): Promise<any[]> {
  try {
    // TODO: Implement actual API call to fetch scripts
    // This is a stub implementation
    return [];
  } catch (error) {
    console.error(`Error fetching scripts for repository ${repositoryId}:`, error);
    throw new Error('Failed to fetch scripts');
  }
}

/**
 * Get available hosts for deployment
 * @returns Array of hosts
 */
export async function getAvailableHosts(): Promise<any[]> {
  try {
    // TODO: Implement actual API call to fetch hosts
    // This is a stub implementation
    return [];
  } catch (error) {
    console.error('Error fetching available hosts:', error);
    throw new Error('Failed to fetch hosts');
  }
}

/**
 * Get deployment status including CI/CD status
 * @param id Deployment ID
 * @returns Object with success status and optional status data
 */
export async function getDeploymentStatus(
  id: string
): Promise<{ success: boolean; deployment?: any; cicd?: any; error?: string }> {
  try {
    // TODO: Implement actual API call to fetch deployment status
    // This is a stub implementation
    return { success: true, deployment: {}, cicd: {} };
  } catch (error) {
    console.error(`Error fetching status for deployment ${id}:`, error);
    return { success: false, error: 'Failed to fetch deployment status' };
  }
}