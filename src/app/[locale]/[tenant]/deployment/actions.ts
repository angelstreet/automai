'use server';

import { Deployment, DeploymentFormData, DeploymentStatus } from './types';
import { deployment, cicd } from '@/lib/supabase/db-deployment';
import { getCICDProvider } from '@/lib/services/cicd';
// Import getUser from user actions which has proper caching and authentication
import { getUser } from '@/app/actions/user';
import { z } from 'zod';
import { AuthUser } from '@/types/user';

// Cache for script data
let scriptsCache: Record<string, { data: { id: string; name: string; path: string; repository: string }[], timestamp: number }> = {};
const SCRIPTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for hosts data
let hostsCache: { data: { id: string; name: string; environment: string; status: string }[], timestamp: number } | null = null;
const HOSTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Add cache for deployments list
let deploymentsCache: { data: Deployment[], timestamp: number } | null = null;
const DEPLOYMENTS_CACHE_TTL = 3 * 60 * 1000; // 3 minutes

/**
 * Get all deployments
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getDeployments(user?: AuthUser | null): Promise<Deployment[]> {
  console.log('Fetching all deployments');
  
  try {
    // Check cache first
    if (deploymentsCache && (Date.now() - deploymentsCache.timestamp < DEPLOYMENTS_CACHE_TTL)) {
      console.log('Returning cached deployments');
      return deploymentsCache.data;
    }
    
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      console.error('Authentication error: No authenticated user');
      return [];
    }

    const tenantId = currentUser.tenant_id || '';
    if (!tenantId) {
      console.error('Authentication error: No tenant ID');
      return [];
    }
    
    // For now, return sample deployments
    // In a real implementation, we would fetch from the database
    const deployments: Deployment[] = [];
    
    // Update cache
    deploymentsCache = {
      data: deployments,
      timestamp: Date.now()
    };
    
    return deployments;
  } catch (error) {
    console.error('Error fetching deployments:', error);
    return [];
  }
}

/**
 * Get deployment by ID
 * @param id Deployment ID to fetch
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getDeploymentById(id: string, user?: AuthUser | null): Promise<Deployment | null> {
  console.log('Fetching deployment by ID:', id);
  
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      console.error('Authentication error: No authenticated user');
      return null;
    }

    const tenantId = currentUser.tenant_id || '';
    if (!tenantId) {
      console.error('Authentication error: No tenant ID');
      return null;
    }
    
    // Get deployment from database
    // In a real implementation, we would fetch from the database
    return null;
  } catch (error) {
    console.error('Error fetching deployment by ID:', error);
    return null;
  }
}

/**
 * Create a new deployment
 * @param formData Deployment form data to create
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function createDeployment(
  formData: DeploymentFormData, 
  user?: AuthUser | null
): Promise<{ success: boolean; deploymentId?: string; error?: string }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = currentUser.tenant_id || '';
    if (!tenantId) {
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    // Validate form data
    if (!formData.name) {
      return {
        success: false,
        error: 'Deployment name is required'
      };
    }
    
    if (!formData.repository) {
      return {
        success: false,
        error: 'Repository is required'
      };
    }
    
    // In a real app, you would create the deployment in your database or API
    // For now, return a mock response
    return {
      success: true,
      deploymentId: `deployment-${Date.now()}`,
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
 * @param id Deployment ID to abort
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function abortDeployment(
  id: string,
  user?: AuthUser | null
): Promise<{ success: boolean; error?: string }> {
  // In a real app, you would call your API to abort a deployment
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));
  
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = currentUser.tenant_id || '';
    if (!tenantId) {
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    // Check if deployment exists and is running
    // In a real implementation, we would fetch from the database
    return { success: false, error: 'Deployment not found' };
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
 * @param id Deployment ID to refresh
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function refreshDeployment(
  id: string,
  user?: AuthUser | null
): Promise<{ success: boolean; deployment?: Deployment; error?: string }> {
  // In a real app, you would call your API to get the latest deployment status
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 700));
  
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = currentUser.tenant_id || '';
    if (!tenantId) {
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    // Find the deployment
    // In a real implementation, we would fetch from the database
    return { 
      success: false, 
      error: 'Deployment not found' 
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
 * @param repositoryId Repository ID to fetch scripts for
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getScriptsForRepository(
  repositoryId: string,
  user?: AuthUser | null
): Promise<{ id: string; name: string; path: string; repository: string }[]> {
  console.log('Fetching scripts for repository:', repositoryId);
  
  // Use provided user data or fetch it if not provided
  const currentUser = user || await getUser();
  if (!currentUser) {
    console.error('Authentication error: No authenticated user');
    return [];
  }

  const tenantId = currentUser.tenant_id || '';
  if (!tenantId) {
    console.error('Authentication error: No tenant ID');
    return [];
  }
  
  // Check cache first
  if (
    scriptsCache[repositoryId] && 
    Date.now() - scriptsCache[repositoryId].timestamp < SCRIPTS_CACHE_TTL
  ) {
    console.log('Scripts found in cache');
    return scriptsCache[repositoryId].data;
  }
  
  try {
    // In a real application, fetch from your database or API
    const scripts: Array<{ id: string; name: string; path: string; repository: string }> = [
      // Sample scripts data
      { id: 'script-1', name: 'Deploy', path: '/deploy.sh', repository: repositoryId },
      { id: 'script-2', name: 'Test', path: '/test.sh', repository: repositoryId },
      { id: 'script-3', name: 'Build', path: '/build.sh', repository: repositoryId }
    ];
    
    // Update cache
    scriptsCache[repositoryId] = {
      data: scripts,
      timestamp: Date.now()
    };
    
    return scripts;
  } catch (error) {
    console.error('Error fetching scripts:', error);
    return [];
  }
}

/**
 * Get available hosts with server-side caching
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getAvailableHosts(
  user?: AuthUser | null
): Promise<{ id: string; name: string; environment: string; status: string }[]> {
  console.log('Fetching available hosts');
  
  // Use provided user data or fetch it if not provided
  const currentUser = user || await getUser();
  if (!currentUser) {
    console.error('Authentication error: No authenticated user');
    return [];
  }

  const tenantId = currentUser.tenant_id || '';
  if (!tenantId) {
    console.error('Authentication error: No tenant ID');
    return [];
  }
  
  // Check cache first
  if (hostsCache && Date.now() - hostsCache.timestamp < HOSTS_CACHE_TTL) {
    console.log('Hosts found in cache');
    return hostsCache.data;
  }
  
  try {
    // In a real application, fetch from your database or API
    const hosts: Array<{ id: string; name: string; environment: string; status: string }> = [
      // Sample hosts data
      { id: 'host-1', name: 'Production Server 1', environment: 'production', status: 'online' },
      { id: 'host-2', name: 'Production Server 2', environment: 'production', status: 'online' },
      { id: 'host-3', name: 'Staging Server 1', environment: 'staging', status: 'online' },
      { id: 'host-4', name: 'Development Server 1', environment: 'development', status: 'online' },
      { id: 'host-5', name: 'Development Server 2', environment: 'development', status: 'offline' }
    ];
    
    // Update cache
    hostsCache = {
      data: hosts,
      timestamp: Date.now()
    };
    
    return hosts;
  } catch (error) {
    console.error('Error fetching hosts:', error);
    return [];
  }
}

/**
 * Get available CI/CD providers for the current tenant
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getAvailableCICDProviders(
  user?: AuthUser | null
): Promise<{ success: boolean; providers?: any[]; error?: string }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = currentUser.tenant_id || '';
    if (!tenantId) {
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    // Get CI/CD providers from database
    const result = await cicd.getCICDProvider({ tenant_id: tenantId });
    
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to get CI/CD providers'
      };
    }
    
    // Return the providers
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
 * @param providerId CI/CD provider ID
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getAvailableCICDJobs(
  providerId: string,
  user?: AuthUser | null
): Promise<{ success: boolean; jobs?: any[]; error?: string }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = currentUser.tenant_id || '';
    if (!tenantId) {
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    // Try to get jobs from database first
    const jobsResult = await cicd.getCICDJobs({ provider_id: providerId, tenant_id: tenantId });
    
    if (jobsResult.success && jobsResult.data && jobsResult.data.length > 0) {
      return {
        success: true,
        jobs: jobsResult.data
      };
    }
    
    // If no jobs found in DB, fetch from the provider
    const providerResult = await cicd.getCICDProvider({ id: providerId, tenant_id: tenantId });
    
    if (!providerResult.success || !providerResult.data) {
      return {
        success: false,
        error: providerResult.error || 'Failed to get CI/CD provider'
      };
    }
    
    const provider = providerResult.data;
    
    // Fetch jobs from the provider
    // This is a placeholder for the actual implementation
    // In a real implementation, you would use the provider data to connect to the CI/CD system
    // and fetch the available jobs
    
    // For now, return a mock response
    return {
      success: true,
      jobs: []
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
 * @param providerId CI/CD provider ID
 * @param jobId CI/CD job ID
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getCICDJobDetails(
  providerId: string,
  jobId: string,
  user?: AuthUser | null
): Promise<{ success: boolean; job?: any; error?: string }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = currentUser.tenant_id || '';
    if (!tenantId) {
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    // Get provider from database
    const providerResult = await cicd.getCICDProvider({ id: providerId, tenant_id: tenantId });
    
    if (!providerResult.success || !providerResult.data) {
      return {
        success: false,
        error: providerResult.error || 'Failed to get CI/CD provider'
      };
    }
    
    const provider = providerResult.data;
    
    // Get job details from the provider
    // This is a placeholder for the actual implementation
    // In a real implementation, you would use the provider data to connect to the CI/CD system
    // and fetch the job details
    
    // For now, return a mock response
    return {
      success: true,
      job: {
        id: jobId,
        name: 'Build and Deploy',
        description: 'Build and deploy the application',
        provider_id: providerId,
        parameters: []
      }
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
 * @param deploymentId Deployment ID to fetch status for
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getDeploymentStatus(
  deploymentId: string, 
  user?: AuthUser | null
): Promise<{ success: boolean; deployment?: any; cicd?: any; error?: string }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = currentUser.tenant_id || '';
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
    // For now, use the sample deployments
    return {
      success: false,
      error: 'Deployment not found'
    };
  } catch (error: any) {
    console.error('Error getting deployment status:', error);
    return {
      success: false,
      error: error.message || 'Failed to get deployment status'
    };
  }
}

/**
 * Trigger a CI/CD job
 * @param providerId CI/CD provider ID
 * @param jobId CI/CD job ID
 * @param parameters Job parameters
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function triggerCICDJob(
  providerId: string, 
  jobId: string, 
  parameters: Record<string, any>,
  user?: AuthUser | null
): Promise<{ success: boolean; build?: any; error?: string }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const tenantId = currentUser.tenant_id || '';
    if (!tenantId) {
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    // Get provider from database
    const providerResult = await cicd.getCICDProvider({ id: providerId, tenant_id: tenantId });
    
    if (!providerResult.success || !providerResult.data) {
      return {
        success: false,
        error: providerResult.error || 'Failed to get CI/CD provider'
      };
    }
    
    const provider = providerResult.data;
    
    // Trigger job on the provider
    // This is a placeholder for the actual implementation
    // In a real implementation, you would use the provider data to connect to the CI/CD system
    // and trigger the job with the provided parameters
    
    // For now, return a mock response
    return {
      success: true,
      build: {
        id: `build-${Date.now()}`,
        job_id: jobId,
        provider_id: providerId,
        status: 'queued',
        parameters,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };
  } catch (error: any) {
    console.error('Error triggering CI/CD job:', error);
    return {
      success: false,
      error: error.message || 'Failed to trigger CI/CD job'
    };
  }
}