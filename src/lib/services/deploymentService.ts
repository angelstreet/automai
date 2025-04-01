/**
 * Deployment Service
 * Business logic for deployment operations
 */
import deploymentDb from '@/lib/supabase/db-deployment';
import hostDb from '@/lib/supabase/db-hosts/host';
import repositoryDb from '@/lib/supabase/db-repositories/db-repository';
import sshService from '@/lib/services/sshService';

// Types from deployment component type
import { 
  Deployment, 
  DeploymentStatus, 
  DeploymentFormData 
} from '@/types/component/deploymentComponentType';

/**
 * Standard service response interface
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string;
}

/**
 * Create a new deployment
 */
export async function createDeployment(formData: DeploymentFormData, userId: string, tenantId: string): Promise<ServiceResponse<Deployment>> {
  try {
    // Validate host exists
    const hostResult = await hostDb.getHostById(formData.targetHostId);
    
    if (!hostResult.success || !hostResult.data) {
      return {
        success: false,
        error: hostResult.error || 'Target host not found'
      };
    }
    
    // Validate repository exists if a repository is provided
    if (formData.repositoryId) {
      const repoResult = await repositoryDb.getRepositoryById(formData.repositoryId);
      
      if (!repoResult.success || !repoResult.data) {
        return {
          success: false,
          error: repoResult.error || 'Repository not found'
        };
      }
    }
    
    // Create the deployment in the database
    const deploymentResult = await deploymentDb.createDeployment({
      name: formData.name,
      description: formData.description,
      status: 'pending',
      repository_id: formData.repositoryId,
      target_host_id: formData.targetHostId,
      script_path: formData.scriptPath,
      branch: formData.branch,
      configuration: formData.configuration,
      schedule: formData.schedule,
      user_id: userId,
      tenant_id: tenantId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    if (!deploymentResult.success || !deploymentResult.data) {
      return {
        success: false,
        error: deploymentResult.error || 'Failed to create deployment'
      };
    }
    
    return {
      success: true,
      data: deploymentResult.data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to create deployment'
    };
  }
}

/**
 * Start a deployment
 */
export async function startDeployment(deploymentId: string): Promise<ServiceResponse<Deployment>> {
  try {
    // Get the deployment
    const deploymentResult = await deploymentDb.getDeploymentById(deploymentId);
    
    if (!deploymentResult.success || !deploymentResult.data) {
      return {
        success: false,
        error: deploymentResult.error || 'Deployment not found'
      };
    }
    
    const deployment = deploymentResult.data;
    
    // Get the host
    const hostResult = await hostDb.getHostById(deployment.target_host_id);
    
    if (!hostResult.success || !hostResult.data) {
      return {
        success: false,
        error: hostResult.error || 'Target host not found'
      };
    }
    
    const host = hostResult.data;
    
    // Update deployment status to running
    const updateResult = await deploymentDb.updateDeploymentStatus(deploymentId, 'running');
    
    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error || 'Failed to update deployment status'
      };
    }
    
    // Execute the deployment script on the target host
    let command = '';
    
    if (deployment.repository_id) {
      // If there's a repository, we need to clone/pull it first
      const repoResult = await repositoryDb.getRepositoryById(deployment.repository_id);
      
      if (!repoResult.success || !repoResult.data) {
        return {
          success: false,
          error: repoResult.error || 'Repository not found'
        };
      }
      
      const repo = repoResult.data;
      
      const repoDir = `/tmp/automai_${repo.id}`;
      const branch = deployment.branch || 'main';
      
      // Clone or pull the repository
      command = `
        if [ -d "${repoDir}" ]; then
          cd "${repoDir}" && git pull origin ${branch}
        else
          git clone ${repo.url} ${repoDir} -b ${branch}
        fi
      `;
      
      // If there's a script path, execute it
      if (deployment.script_path) {
        command += ` && cd ${repoDir} && ${deployment.script_path}`;
      }
    } else if (deployment.script_path) {
      // Just execute the script path
      command = deployment.script_path;
    } else {
      return {
        success: false,
        error: 'No repository or script path provided'
      };
    }
    
    // Execute the command via SSH
    const sshResult = await sshService.executeCommand({
      host: host.ip,
      port: host.port,
      username: host.username,
      password: host.password,
      privateKey: host.private_key,
      command
    });
    
    // Update deployment status based on execution result
    const status: DeploymentStatus = sshResult.success ? 'success' : 'failed';
    
    const finalUpdateResult = await deploymentDb.updateDeployment(deploymentId, {
      status,
      completed_at: new Date().toISOString(),
      output: sshResult.data?.stdout || '',
      error_output: sshResult.data?.stderr || '',
      exit_code: sshResult.data?.code || -1
    });
    
    if (!finalUpdateResult.success) {
      return {
        success: false,
        error: finalUpdateResult.error || 'Failed to update deployment status'
      };
    }
    
    return {
      success: true,
      data: finalUpdateResult.data
    };
  } catch (error: any) {
    // Update deployment status to failed in case of an error
    try {
      await deploymentDb.updateDeploymentStatus(deploymentId, 'failed');
    } catch (updateError) {
      console.error('Failed to update deployment status after error:', updateError);
    }
    
    return {
      success: false,
      error: error.message || 'Failed to start deployment'
    };
  }
}

/**
 * Stop a deployment
 */
export async function stopDeployment(deploymentId: string): Promise<ServiceResponse<Deployment>> {
  try {
    // Get the deployment
    const deploymentResult = await deploymentDb.getDeploymentById(deploymentId);
    
    if (!deploymentResult.success || !deploymentResult.data) {
      return {
        success: false,
        error: deploymentResult.error || 'Deployment not found'
      };
    }
    
    // Can only stop a running deployment
    if (deploymentResult.data.status !== 'running') {
      return {
        success: false,
        error: 'Deployment is not running'
      };
    }
    
    // In a real implementation, this would actually stop the deployment process
    // For now, we'll just update the status
    
    const updateResult = await deploymentDb.updateDeploymentStatus(deploymentId, 'cancelled');
    
    if (!updateResult.success) {
      return {
        success: false,
        error: updateResult.error || 'Failed to update deployment status'
      };
    }
    
    return {
      success: true,
      data: updateResult.data
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to stop deployment'
    };
  }
}

/**
 * Delete a deployment
 */
export async function deleteDeployment(deploymentId: string): Promise<ServiceResponse<null>> {
  try {
    // Get the deployment to check if it's not running
    const deploymentResult = await deploymentDb.getDeploymentById(deploymentId);
    
    if (!deploymentResult.success || !deploymentResult.data) {
      return {
        success: false,
        error: deploymentResult.error || 'Deployment not found'
      };
    }
    
    // Can't delete a running deployment
    if (deploymentResult.data.status === 'running') {
      return {
        success: false,
        error: 'Cannot delete a running deployment'
      };
    }
    
    // Delete the deployment
    const deleteResult = await deploymentDb.deleteDeployment(deploymentId);
    
    if (!deleteResult.success) {
      return {
        success: false,
        error: deleteResult.error || 'Failed to delete deployment'
      };
    }
    
    return {
      success: true
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to delete deployment'
    };
  }
}

// Default export for all deployment service functions
const deploymentService = {
  createDeployment,
  startDeployment,
  stopDeployment,
  deleteDeployment
};

export default deploymentService;