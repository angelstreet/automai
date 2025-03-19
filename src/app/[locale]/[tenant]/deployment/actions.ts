'use server';

import { Deployment, DeploymentFormData } from './types';
import { SAMPLE_DEPLOYMENTS } from './constants';
import { deployment, cicd } from '@/lib/supabase/db-deployment';
import { getCICDProvider } from '@/lib/services/cicd';
import { getSession } from '@/lib/supabase/auth';
import { z } from 'zod';

/**
 * Get all deployments
 */
export async function getDeployments(): Promise<Deployment[]> {
  console.log('Fetching all deployments');
  
  try {
    // Get session for authentication and tenant isolation
    const session = await getSession();
    if (!session?.user) {
      console.error('Authentication error: No session or user');
      return [];
    }

    const tenantId = session.user.tenantId || '';
    if (!tenantId) {
      console.error('Authentication error: No tenant ID');
      return [];
    }
    
    // Try to get from database first
    const dbDeployments = await deployment.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' }
    });
    
    console.log('Deployments from DB:', dbDeployments.length, 'deployments found');
    
    if (dbDeployments.length > 0) {
      // Convert to the expected format
      return dbDeployments.map(dbDep => {
        return {
          id: dbDep.id,
          name: dbDep.name,
          description: dbDep.description || '',
          repositoryId: dbDep.repository_id,
          status: dbDep.status as DeploymentStatus,
          createdBy: dbDep.user_id,
          createdAt: dbDep.created_at,
          scheduledFor: dbDep.scheduled_time,
          startedAt: dbDep.started_at,
          completedAt: dbDep.completed_at,
          scripts: dbDep.scripts.map((scriptId: string) => ({
            id: scriptId,
            repositoryId: dbDep.repository_id,
            name: 'Script', // Would need to fetch actual script details
            path: scriptId,
            status: 'pending'
          })),
          hosts: dbDep.hosts.map((hostId: string) => ({
            id: hostId,
            name: 'Host', // Would need to fetch actual host details
            environment: 'Unknown',
            status: 'pending'
          })),
          configuration: {
            schedule: dbDep.schedule_type === 'now' ? 'immediate' : 'scheduled',
            scheduledTime: dbDep.scheduled_time,
            environmentVariables: {},
            notifications: {
              email: false,
              slack: false
            },
            runnerType: 'direct'
          }
        };
      });
    }
    
    // Fallback to sample data if no deployments found
    console.log('No deployments found in DB, using sample data');
    return [...SAMPLE_DEPLOYMENTS];
  } catch (error) {
    console.error('Error fetching deployments:', error);
    // Fallback to sample data on error
    return [...SAMPLE_DEPLOYMENTS];
  }
}

/**
 * Get deployment by ID
 */
export async function getDeploymentById(id: string): Promise<Deployment | null> {
  // In a real app, you would fetch a specific deployment from your API
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const deployment = SAMPLE_DEPLOYMENTS.find(d => d.id === id);
  return deployment ? { ...deployment } : null;
}

/**
 * Create a new deployment with optional CI/CD integration
 */
export async function createDeployment(formData: DeploymentFormData): Promise<{ success: boolean; deploymentId?: string; error?: string }> {
  console.log('Creating deployment with data:', JSON.stringify(formData, null, 2));
  
  try {
    // Get session for authentication and tenant isolation
    const session = await getSession();
    if (!session?.user) {
      console.error('Authentication error: No session or user');
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = session.user.tenantId || '';
    if (!tenantId) {
      console.error('Authentication error: No tenant ID');
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    console.log('Creating deployment for tenant:', tenantId, 'user:', session.user.id);
    
    // Validate required fields
    if (!formData.name || !formData.repository || formData.selectedScripts.length === 0 || formData.selectedHosts.length === 0) {
      console.error('Validation error: Missing required fields');
      return { 
        success: false, 
        error: 'Missing required fields' 
      };
    }
    
    // Create the deployment record
    const deploymentData = {
      name: formData.name,
      description: formData.description || '',
      repository_id: formData.repository,
      scripts: formData.selectedScripts,
      hosts: formData.selectedHosts,
      schedule_type: formData.schedule || 'now',
      scheduled_time: formData.scheduledTime || null,
      cron_expression: formData.cronExpression || null,
      repeat_count: formData.repeatCount || 0,
      parameters: formData.parameters || {},
      environment_vars: formData.environmentVars || {},
      tenant_id: tenantId,
      user_id: session.user.id,
      status: 'pending'
    };
    
    console.log('Deployment data prepared:', JSON.stringify(deploymentData, null, 2));
    
    // Create deployment in the database
    console.log('Creating deployment record in database...');
    const deploymentResult = await deployment.create({ data: deploymentData });
    
    if (!deploymentResult) {
      console.error('Failed to create deployment record');
      return {
        success: false,
        error: 'Failed to create deployment record'
      };
    }
    
    console.log('Deployment created successfully:', deploymentResult.id);
    
    // Check if CI/CD integration is enabled
    if (formData.jenkinsConfig?.enabled && formData.jenkinsConfig?.providerId && formData.jenkinsConfig?.jobId) {
      console.log('Jenkins integration enabled, creating mapping...');
      
      // Create CI/CD mapping
      const mappingResult = await cicd.createDeploymentCICDMapping({
        deployment_id: deploymentResult.id,
        provider_id: formData.jenkinsConfig.providerId,
        job_id: formData.jenkinsConfig.jobId,
        tenant_id: tenantId,
        parameters: formData.jenkinsConfig.parameters || {}
      });
      
      if (!mappingResult.success) {
        console.error('Failed to create CI/CD mapping:', mappingResult.error);
        
        // Update deployment with error
        await deployment.update({
          where: { id: deploymentResult.id },
          data: { status: 'error', error_message: 'Failed to create CI/CD mapping' }
        });
        
        return {
          success: false,
          error: 'Failed to create CI/CD integration: ' + mappingResult.error,
          deploymentId: deploymentResult.id
        };
      }
      
      console.log('CI/CD mapping created successfully:', mappingResult.data.id);
      
      // Try to trigger the CI/CD job
      // Get provider from database
      console.log('Getting CI/CD provider:', formData.jenkinsConfig.providerId);
      const providerResult = await getCICDProvider(formData.jenkinsConfig.providerId, tenantId);
      
      if (!providerResult.success || !providerResult.data) {
        console.error('Failed to get CI/CD provider:', providerResult.error);
        
        await deployment.update({
          where: { id: deploymentResult.id },
          data: { status: 'error', error_message: 'Failed to get CI/CD provider' }
        });
        
        return {
          success: false,
          error: 'Failed to get CI/CD provider: ' + (providerResult.error || 'Unknown error'),
          deploymentId: deploymentResult.id
        };
      }
      
      // Trigger the job
      console.log('Triggering CI/CD job:', formData.jenkinsConfig.jobId);
      const provider = providerResult.data;
      const triggerResult = await provider.triggerJob(
        formData.jenkinsConfig.jobId,
        formData.jenkinsConfig.parameters || {}
      );
      
      if (!triggerResult.success) {
        console.error('Failed to trigger CI/CD job:', triggerResult.error);
        
        // Update deployment with error
        await deployment.update({
          where: { id: deploymentResult.id },
          data: { status: 'error', error_message: 'Failed to trigger CI/CD job' }
        });
        
        // Update mapping with error
        await cicd.updateDeploymentCICDMapping(
          { id: mappingResult.data.id, tenant_id: tenantId },
          { status: 'error' }
        );
        
        return {
          success: false,
          error: 'Failed to trigger CI/CD job: ' + triggerResult.error,
          deploymentId: deploymentResult.id
        };
      }
      
      console.log('CI/CD job triggered successfully:', triggerResult.data.id);
      
      // Update mapping with build ID and URL
      await cicd.updateDeploymentCICDMapping(
        { id: mappingResult.data.id, tenant_id: tenantId },
        {
          status: 'running',
          build_id: triggerResult.data.id,
          build_url: triggerResult.data.url
        }
      );
      
      // Update deployment status
      await deployment.update({
        where: { id: deploymentResult.id },
        data: { status: 'in_progress' }
      });
      
      console.log('Deployment status updated to in_progress');
    }
    
    console.log('Deployment creation completed:', deploymentResult.id);
    return { 
      success: true,
      deploymentId: deploymentResult.id
    };
  } catch (error: any) {
    console.error('Error creating deployment:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to create deployment' 
    };
  }
}

/**
 * Abort a running deployment
 */
export async function abortDeployment(id: string): Promise<{ success: boolean; error?: string }> {
  // In a real app, you would call your API to abort a deployment
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  try {
    // Check if deployment exists and is running
    const deployment = SAMPLE_DEPLOYMENTS.find(d => d.id === id);
    
    if (!deployment) {
      return { 
        success: false, 
        error: 'Deployment not found' 
      };
    }
    
    if (deployment.status !== 'in_progress') {
      return { 
        success: false, 
        error: 'Deployment is not running' 
      };
    }
    
    // In a real app, you would abort the deployment here
    // For now, just return success
    return { success: true };
  } catch (error) {
    console.error('Error aborting deployment:', error);
    return { 
      success: false, 
      error: 'Failed to abort deployment' 
    };
  }
}

/**
 * Refresh deployment status
 */
export async function refreshDeployment(id: string): Promise<{ success: boolean; deployment?: Deployment; error?: string }> {
  // In a real app, you would call your API to get the latest deployment status
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 700));
  
  try {
    // Find the deployment
    const deployment = SAMPLE_DEPLOYMENTS.find(d => d.id === id);
    
    if (!deployment) {
      return { 
        success: false, 
        error: 'Deployment not found' 
      };
    }
    
    // In a real app, you would fetch the latest status
    // For now, just return the deployment
    return { 
      success: true,
      deployment: { ...deployment }
    };
  } catch (error) {
    console.error('Error refreshing deployment:', error);
    return { 
      success: false, 
      error: 'Failed to refresh deployment status' 
    };
  }
}

/**
 * Get scripts for a repository with server-side caching
 */
// Cache for script data
let scriptsCache: Record<string, { data: any[], timestamp: number }> = {};
const SCRIPTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getScriptsForRepository(repositoryId: string): Promise<{ id: string; name: string; path: string; repository: string }[]> {
  console.log('Fetching scripts for repository:', repositoryId);
  
  // Check cache first
  if (
    scriptsCache[repositoryId] && 
    Date.now() - scriptsCache[repositoryId].timestamp < SCRIPTS_CACHE_TTL
  ) {
    console.log('Scripts found in cache');
    return scriptsCache[repositoryId].data;
  }
  
  console.log('Scripts not in cache or cache expired, fetching from source');
  
  try {
    // In a real app, you would fetch scripts from your API
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Return sample scripts for the repository
    const scripts = [
      { id: '1', name: 'deploy.py', path: '/src/deploy.py', repository: '1' },
      { id: '2', name: 'backup.sh', path: '/src/backup.sh', repository: '1' },
      { id: '3', name: 'process_data.py', path: '/scripts/process_data.py', repository: '3' },
    ].filter(script => script.repository === repositoryId);
    
    // Update cache
    scriptsCache[repositoryId] = {
      data: scripts,
      timestamp: Date.now()
    };
    
    console.log('Scripts fetched and cached:', scripts.length, 'scripts');
    return scripts;
  } catch (error) {
    console.error('Error fetching repository scripts:', error);
    
    // Return empty array on error
    return [];
  }
}

/**
 * Get available hosts with server-side caching
 */
// Cache for hosts data
let hostsCache: { data: any[], timestamp: number } | null = null;
const HOSTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getAvailableHosts(): Promise<{ id: string; name: string; environment: string; status: string }[]> {
  console.log('Fetching available hosts');
  
  // Check cache first
  if (hostsCache && Date.now() - hostsCache.timestamp < HOSTS_CACHE_TTL) {
    console.log('Hosts found in cache');
    return hostsCache.data;
  }
  
  console.log('Hosts not in cache or cache expired, fetching from source');
  
  try {
    // In a real app, you would fetch hosts from your API
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Sample hosts data
    const hosts = [
      { id: '1', name: 'Production Web Server', environment: 'Production', status: 'connected' },
      { id: '2', name: 'Staging Server', environment: 'Staging', status: 'connected' },
      { id: '3', name: 'Dev Environment', environment: 'Development', status: 'connected' },
    ];
    
    // Update cache
    hostsCache = {
      data: hosts,
      timestamp: Date.now()
    };
    
    console.log('Hosts fetched and cached:', hosts.length, 'hosts');
    return hosts;
  } catch (error) {
    console.error('Error fetching available hosts:', error);
    
    // Return empty array on error
    return [];
  }
}

/**
 * Get available CI/CD providers for the current tenant
 */
export async function getAvailableCICDProviders(): Promise<{ success: boolean; providers?: any[]; error?: string }> {
  try {
    // Get current user session
    const session = await getSession();
    if (!session?.user) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = session.user.tenantId || '';
    if (!tenantId) {
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    // Get providers from database
    const result = await cicd.getCICDProvider({ tenant_id: tenantId });
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to get CI/CD providers'
      };
    }
    
    return {
      success: true,
      providers: result.data
    };
  } catch (error: any) {
    console.error('Error getting CI/CD providers:', error);
    return {
      success: false,
      error: error.message || 'Failed to get CI/CD providers'
    };
  }
}

/**
 * Get available CI/CD jobs for a specific provider
 */
export async function getAvailableCICDJobs(providerId: string): Promise<{ success: boolean; jobs?: any[]; error?: string }> {
  try {
    // Get current user session
    const session = await getSession();
    if (!session?.user) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = session.user.tenantId || '';
    if (!tenantId) {
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    // Validation
    if (!providerId) {
      return {
        success: false,
        error: 'Provider ID is required'
      };
    }
    
    // First check if we have jobs in the database
    const dbJobsResult = await cicd.getCICDJobs({ provider_id: providerId, tenant_id: tenantId });
    
    if (dbJobsResult.success && dbJobsResult.data && dbJobsResult.data.length > 0) {
      return {
        success: true,
        jobs: dbJobsResult.data
      };
    }
    
    // If no jobs found in DB, fetch from the provider
    const providerResult = await getCICDProvider(providerId, tenantId);
    
    if (!providerResult.success || !providerResult.data) {
      return {
        success: false,
        error: providerResult.error || 'Failed to get CI/CD provider'
      };
    }
    
    // Get available jobs from the provider
    const provider = providerResult.data;
    const jobsResult = await provider.getAvailableJobs();
    
    if (!jobsResult.success) {
      return {
        success: false,
        error: jobsResult.error || 'Failed to get CI/CD jobs'
      };
    }
    
    // Return the jobs
    return {
      success: true,
      jobs: jobsResult.data
    };
  } catch (error: any) {
    console.error('Error getting CI/CD jobs:', error);
    return {
      success: false,
      error: error.message || 'Failed to get CI/CD jobs'
    };
  }
}

/**
 * Get job details including parameters
 */
export async function getCICDJobDetails(providerId: string, jobId: string): Promise<{ success: boolean; job?: any; error?: string }> {
  try {
    // Get current user session
    const session = await getSession();
    if (!session?.user) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = session.user.tenantId || '';
    if (!tenantId) {
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    // Validation
    if (!providerId || !jobId) {
      return {
        success: false,
        error: 'Provider ID and Job ID are required'
      };
    }
    
    // Get provider from database
    const providerResult = await getCICDProvider(providerId, tenantId);
    
    if (!providerResult.success || !providerResult.data) {
      return {
        success: false,
        error: providerResult.error || 'Failed to get CI/CD provider'
      };
    }
    
    // Get job details from the provider
    const provider = providerResult.data;
    const jobResult = await provider.getJobDetails(jobId);
    
    if (!jobResult.success) {
      return {
        success: false,
        error: jobResult.error || 'Failed to get CI/CD job details'
      };
    }
    
    // Return the job details
    return {
      success: true,
      job: jobResult.data
    };
  } catch (error: any) {
    console.error('Error getting CI/CD job details:', error);
    return {
      success: false,
      error: error.message || 'Failed to get CI/CD job details'
    };
  }
}

/**
 * Get deployment status including CI/CD status
 */
export async function getDeploymentStatus(deploymentId: string): Promise<{ success: boolean; deployment?: any; cicd?: any; error?: string }> {
  try {
    // Get current user session
    const session = await getSession();
    if (!session?.user) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = session.user.tenantId || '';
    if (!tenantId) {
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    // Validation
    if (!deploymentId) {
      return {
        success: false,
        error: 'Deployment ID is required'
      };
    }
    
    // Get deployment from database
    const deploymentResult = await deployment.findUnique({ 
      where: { id: deploymentId, tenant_id: tenantId } 
    });
    
    if (!deploymentResult) {
      return {
        success: false,
        error: 'Deployment not found'
      };
    }
    
    // Check if deployment has CI/CD mapping
    const mappingResult = await cicd.getDeploymentCICDMapping({
      deployment_id: deploymentId,
      tenant_id: tenantId
    });
    
    if (!mappingResult.success || !mappingResult.data) {
      // No CI/CD mapping found, just return the deployment
      return {
        success: true,
        deployment: deploymentResult
      };
    }
    
    const mapping = mappingResult.data;
    
    // If build is still running, check the latest status
    if (mapping.status === 'running' && mapping.build_id) {
      // Get provider
      const providerResult = await getCICDProvider(mapping.provider_id, tenantId);
      
      if (providerResult.success && providerResult.data) {
        const provider = providerResult.data;
        
        // Get build status
        const statusResult = await provider.getBuildStatus(mapping.job_id, mapping.build_id);
        
        if (statusResult.success) {
          // Update mapping status
          await cicd.updateDeploymentCICDMapping(
            { id: mapping.id, tenant_id: tenantId },
            { status: statusResult.data.status }
          );
          
          // Update deployment status if needed
          if (statusResult.data.status === 'success') {
            await deployment.update({
              where: { id: deploymentId },
              data: { status: 'completed' }
            });
          } else if (statusResult.data.status === 'failure') {
            await deployment.update({
              where: { id: deploymentId },
              data: { status: 'failed' }
            });
          }
          
          // Update the mapping object for the response
          mapping.status = statusResult.data.status;
        }
      }
    }
    
    // Return deployment and CI/CD status
    return {
      success: true,
      deployment: deploymentResult,
      cicd: mapping
    };
  } catch (error: any) {
    console.error('Error getting deployment status:', error);
    return {
      success: false,
      error: error.message || 'Failed to get deployment status'
    };
  }
}