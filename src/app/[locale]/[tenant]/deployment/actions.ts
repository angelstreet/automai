'use server';

import { Deployment, DeploymentFormData } from './types';
import { deployment, cicd } from '@/lib/supabase/db-deployment';
import { getCICDProvider } from '@/lib/services/cicd';
// Import getUser which should be trusted over getSession in server components
import { getUser, getSupabaseSession } from '@/lib/supabase/auth';
import { z } from 'zod';

/**
 * Get all deployments
 */
export async function getDeployments(): Promise<Deployment[]> {
  console.log('Fetching all deployments');
  
  try {
    // Get session for authentication and tenant isolation
    const sessionResult = await getSupabaseSession();
    if (!sessionResult.success || !sessionResult.data?.user) {
      console.error('Authentication error: No session or user');
      return [];
    }

    const session = sessionResult.data;
    const tenantId = session.user.tenant_id || '';
    if (!tenantId) {
      console.error('Authentication error: No tenant ID');
      return [];
    }
    
    // Get deployments from database
    const dbDeployments = await deployment.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' }
    });
    
    console.log('Deployments from DB:', dbDeployments.length, 'deployments found');
    
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
  } catch (error) {
    console.error('Error fetching deployments:', error);
    return [];
  }
}

/**
 * Get deployment by ID
 */
export async function getDeploymentById(id: string): Promise<Deployment | null> {
  console.log('Fetching deployment by ID:', id);
  
  try {
    // Get session for authentication and tenant isolation
    const session = await getSession();
    if (!session?.user) {
      console.error('Authentication error: No session or user');
      return null;
    }

    const tenantId = session.user.tenantId || '';
    if (!tenantId) {
      console.error('Authentication error: No tenant ID');
      return null;
    }
    
    // Get deployment from database
    const dbDeployment = await deployment.findUnique({
      where: { id, tenant_id: tenantId }
    });
    
    if (!dbDeployment) {
      console.log('Deployment not found:', id);
      return null;
    }
    
    console.log('Deployment found:', dbDeployment.id);
    
    // Convert to the expected format
    return {
      id: dbDeployment.id,
      name: dbDeployment.name,
      description: dbDeployment.description || '',
      repositoryId: dbDeployment.repository_id,
      status: dbDeployment.status as DeploymentStatus,
      createdBy: dbDeployment.user_id,
      createdAt: dbDeployment.created_at,
      scheduledFor: dbDeployment.scheduled_time,
      startedAt: dbDeployment.started_at,
      completedAt: dbDeployment.completed_at,
      scripts: dbDeployment.scripts.map((scriptId: string) => ({
        id: scriptId,
        repositoryId: dbDeployment.repository_id,
        name: 'Script', // Would need to fetch actual script details
        path: scriptId,
        status: 'pending'
      })),
      hosts: dbDeployment.hosts.map((hostId: string) => ({
        id: hostId,
        name: 'Host', // Would need to fetch actual host details
        environment: 'Unknown',
        status: 'pending'
      })),
      configuration: {
        schedule: dbDeployment.schedule_type === 'now' ? 'immediate' : 'scheduled',
        scheduledTime: dbDeployment.scheduled_time,
        environmentVariables: {},
        notifications: {
          email: false,
          slack: false
        },
        runnerType: 'direct'
      }
    };
  } catch (error) {
    console.error('Error fetching deployment by ID:', error);
    return null;
  }
}

/**
 * Create a new deployment with optional CI/CD integration
 */
export async function createDeployment(formData: DeploymentFormData): Promise<{ success: boolean; deploymentId?: string; error?: string }> {
  console.log('[ACTION:DEPLOYMENT] ====== START: Create Deployment ======');
  console.log('[ACTION:DEPLOYMENT] Form data received:', JSON.stringify(formData, null, 2));
  
  try {
    console.log('[ACTION:DEPLOYMENT] Getting authenticated user...');
    // Use getUser() instead of getSession() per best practices for server components
    let user;
    try {
      // getUser() is the recommended method for server components per docs
      const userResult = await getUser();
      
      console.log('[ACTION:DEPLOYMENT] User result:', JSON.stringify({
        success: userResult.success,
        hasUser: !!userResult.data,
        userId: userResult.data?.id || 'none',
        email: userResult.data?.email || 'none',
        tenantId: userResult.data?.tenantId || 'none',
        error: userResult.error || 'none'
      }));
      
      if (!userResult.success) {
        console.error('[ACTION:DEPLOYMENT] Authentication error:', userResult.error);
        return { 
          success: false, 
          error: 'Unauthorized - ' + (userResult.error || 'Authentication failed')
        };
      }
      
      if (!userResult.data) {
        console.error('[ACTION:DEPLOYMENT] Authentication error: No user data returned');
        return { 
          success: false, 
          error: 'Unauthorized - No user found' 
        };
      }
      
      user = userResult.data;
    } catch (authError) {
      console.error('[ACTION:DEPLOYMENT] Exception during getUser():', authError);
      console.error('[ACTION:DEPLOYMENT] Auth error stack:', authError.stack);
      return { 
        success: false, 
        error: 'Authentication error: ' + authError.message 
      };
    }

    const tenantId = user.tenantId || '';
    if (!tenantId) {
      console.error('[ACTION:DEPLOYMENT] Authentication error: No tenant ID in user data');
      console.log('[ACTION:DEPLOYMENT] User data:', JSON.stringify({
        user_id: user.id,
        email: user.email,
        has_tenant: !!user.tenantId
      }));
      return {
        success: false,
        error: 'Tenant ID is required'
      };
    }
    
    console.log(`[ACTION:DEPLOYMENT] Creating deployment for tenant: ${tenantId}, user: ${user.id}`);
    
    // Validate required fields
    const validationErrors = [];
    if (!formData.name) validationErrors.push('name');
    if (!formData.repository) validationErrors.push('repository');
    if (!formData.selectedScripts || formData.selectedScripts.length === 0) validationErrors.push('selectedScripts');
    if (!formData.selectedHosts || formData.selectedHosts.length === 0) validationErrors.push('selectedHosts');
    
    if (validationErrors.length > 0) {
      console.error(`[ACTION:DEPLOYMENT] Validation error: Missing required fields: ${validationErrors.join(', ')}`);
      return { 
        success: false, 
        error: `Missing required fields: ${validationErrors.join(', ')}` 
      };
    }
    
    // Log script information for debugging
    console.log('[ACTION:DEPLOYMENT] Selected scripts:', JSON.stringify(formData.selectedScripts));
    
    // If we have scripts, we need to resolve them to actual script paths
    if (formData.selectedScripts && formData.selectedScripts.length > 0) {
      console.log('[ACTION:DEPLOYMENT] Script mapping information:');
      
      // Log any script info we can access
      if (formData.scriptMapping) {
        console.log('[ACTION:DEPLOYMENT] Script ID to path mapping:', JSON.stringify(formData.scriptMapping));
      } else {
        console.log('[ACTION:DEPLOYMENT] No script mapping provided in formData');
      }
      
      // If Jenkins is enabled, log how scripts relate to Jenkins parameters
      if (formData.jenkinsConfig?.enabled) {
        console.log('[ACTION:DEPLOYMENT] Jenkins parameters:', JSON.stringify(formData.jenkinsConfig.parameters || {}));
        console.log('[ACTION:DEPLOYMENT] Need to verify how scripts map to Jenkins parameters');
      }
    }
    
    console.log('[ACTION:DEPLOYMENT] All required fields present, preparing deployment data');
    
    // Transform the scripts array to include path information from the scriptMapping
    const scripts = formData.selectedScripts.map(scriptId => {
      // If we have mapping info, use it, otherwise just use the script ID
      if (formData.scriptMapping && formData.scriptMapping[scriptId]) {
        const scriptInfo = formData.scriptMapping[scriptId];
        return {
          id: scriptId,
          path: scriptInfo.path,
          name: scriptInfo.name,
          type: scriptInfo.type
        };
      }
      return scriptId;
    });
    
    console.log('[ACTION:DEPLOYMENT] Transformed scripts data:', JSON.stringify(scripts));
    
    // Create the deployment record
    const deploymentData = {
      name: formData.name,
      description: formData.description || '',
      repository_id: formData.repository,
      scripts: scripts, // Use the transformed scripts with path info
      hosts: formData.selectedHosts,
      schedule_type: formData.schedule || 'now',
      scheduled_time: formData.scheduledTime || null,
      cron_expression: formData.cronExpression || null,
      repeat_count: formData.repeatCount || 0,
      parameters: formData.parameters || {},
      environment_vars: formData.environmentVars || {},
      tenant_id: tenantId,
      user_id: user.id,
      status: 'pending'
    };
    
    console.log('[ACTION:DEPLOYMENT] Deployment data prepared:', JSON.stringify(deploymentData, null, 2));
    
    // Create deployment in the database
    console.log('[ACTION:DEPLOYMENT] Creating deployment record in database...');
    
    try {
      const deploymentResult = await deployment.create({ data: deploymentData });
      
      if (!deploymentResult) {
        console.error('[ACTION:DEPLOYMENT] Failed to create deployment record - null result returned');
        return {
          success: false,
          error: 'Failed to create deployment record'
        };
      }
      
      console.log(`[ACTION:DEPLOYMENT] Deployment created successfully with ID: ${deploymentResult.id}`);
      console.log('[ACTION:DEPLOYMENT] Deployment record:', JSON.stringify(deploymentResult, null, 2));
      
      // Check if CI/CD integration is enabled
      if (formData.jenkinsConfig?.enabled && formData.jenkinsConfig?.providerId && formData.jenkinsConfig?.jobId) {
        console.log('[ACTION:DEPLOYMENT] Jenkins integration enabled with:');
        console.log(`[ACTION:DEPLOYMENT] - Provider ID: ${formData.jenkinsConfig.providerId}`);
        console.log(`[ACTION:DEPLOYMENT] - Job ID: ${formData.jenkinsConfig.jobId}`);
        
        // Store the jenkins parameters at this scope so they're available throughout
        let jenkinsParams = formData.jenkinsConfig.parameters || {};
        
        // If we have scripts with path info, add them to Jenkins parameters
        if (scripts && scripts.length > 0 && typeof scripts[0] === 'object') {
          // Create a special SCRIPTS parameter with the array of script data
          jenkinsParams = {
            ...jenkinsParams,
            SCRIPTS: JSON.stringify(scripts),
            DEPLOYMENT_ID: deploymentResult.id,
            REPOSITORY_ID: formData.repository
          };
          console.log('[ACTION:DEPLOYMENT] Enhanced Jenkins parameters with script info');
        }
        
        console.log(`[ACTION:DEPLOYMENT] - Parameters: ${JSON.stringify(jenkinsParams)}`);
        
        // Define a variable scoped to the entire function for these parameters
        const finalJenkinsParams = jenkinsParams;
        
        // Create CI/CD mapping
        console.log('[ACTION:DEPLOYMENT] Creating CI/CD mapping...');
        
        try {
          const mappingResult = await cicd.createDeploymentCICDMapping({
            deployment_id: deploymentResult.id,
            provider_id: formData.jenkinsConfig.providerId,
            job_id: formData.jenkinsConfig.jobId,
            tenant_id: tenantId,
            parameters: finalJenkinsParams || {}
          });
          
          if (!mappingResult.success) {
            console.error(`[ACTION:DEPLOYMENT] Failed to create CI/CD mapping: ${mappingResult.error}`);
            
            // Update deployment with error
            console.log('[ACTION:DEPLOYMENT] Updating deployment with error status...');
            try {
              await deployment.update({
                where: { id: deploymentResult.id },
                data: { status: 'error', error_message: 'Failed to create CI/CD mapping' }
              });
              console.log('[ACTION:DEPLOYMENT] Deployment updated with error status');
            } catch (updateError) {
              console.error('[ACTION:DEPLOYMENT] Failed to update deployment with error status:', updateError);
            }
            
            return {
              success: false,
              error: 'Failed to create CI/CD integration: ' + mappingResult.error,
              deploymentId: deploymentResult.id
            };
          }
          
          console.log(`[ACTION:DEPLOYMENT] CI/CD mapping created successfully with ID: ${mappingResult.data.id}`);
          
          // Try to trigger the CI/CD job
          // Get provider from database
          console.log(`[ACTION:DEPLOYMENT] Getting CI/CD provider with ID: ${formData.jenkinsConfig.providerId}`);
          const providerResult = await getCICDProvider(formData.jenkinsConfig.providerId, tenantId);
          
          if (!providerResult.success || !providerResult.data) {
            console.error(`[ACTION:DEPLOYMENT] Failed to get CI/CD provider: ${providerResult.error || 'No provider data returned'}`);
            console.log('[ACTION:DEPLOYMENT] Provider result:', JSON.stringify(providerResult));
            
            try {
              await deployment.update({
                where: { id: deploymentResult.id },
                data: { status: 'error', error_message: 'Failed to get CI/CD provider' }
              });
              console.log('[ACTION:DEPLOYMENT] Deployment updated with error status');
            } catch (updateError) {
              console.error('[ACTION:DEPLOYMENT] Failed to update deployment with error status:', updateError);
            }
            
            return {
              success: false,
              error: 'Failed to get CI/CD provider: ' + (providerResult.error || 'Unknown error'),
              deploymentId: deploymentResult.id
            };
          }
          
          // Trigger the job
          console.log(`[ACTION:DEPLOYMENT] CI/CD provider found, triggering job: ${formData.jenkinsConfig.jobId}`);
          console.log('[ACTION:DEPLOYMENT] Provider type:', providerResult.data.type);
          
          const provider = providerResult.data;
          
          // Check if the provider is a valid instance with triggerJob method
          if (!provider || typeof provider.triggerJob !== 'function') {
            console.error('[ACTION:DEPLOYMENT] Invalid provider instance:', provider);
            
            try {
              await deployment.update({
                where: { id: deploymentResult.id },
                data: { status: 'error', error_message: 'Invalid CI/CD provider instance' }
              });
            } catch (updateError) {
              console.error('[ACTION:DEPLOYMENT] Failed to update deployment with error status:', updateError);
            }
            
            return {
              success: false,
              error: 'Invalid CI/CD provider instance',
              deploymentId: deploymentResult.id
            };
          }
          
          console.log('[ACTION:DEPLOYMENT] Calling provider.triggerJob...');
          const triggerResult = await provider.triggerJob(
            formData.jenkinsConfig.jobId,
            finalJenkinsParams || {}
          );
          
          console.log('[ACTION:DEPLOYMENT] Trigger result:', JSON.stringify(triggerResult));
          
          if (!triggerResult.success) {
            console.error(`[ACTION:DEPLOYMENT] Failed to trigger CI/CD job: ${triggerResult.error}`);
            
            // Update deployment with error
            console.log('[ACTION:DEPLOYMENT] Updating deployment and mapping with error status...');
            try {
              await deployment.update({
                where: { id: deploymentResult.id },
                data: { status: 'error', error_message: 'Failed to trigger CI/CD job: ' + triggerResult.error }
              });
              
              // Update mapping with error
              await cicd.updateDeploymentCICDMapping(
                { id: mappingResult.data.id, tenant_id: tenantId },
                { status: 'error', error_message: triggerResult.error }
              );
              
              console.log('[ACTION:DEPLOYMENT] Deployment and mapping updated with error status');
            } catch (updateError) {
              console.error('[ACTION:DEPLOYMENT] Failed to update status with error:', updateError);
            }
            
            return {
              success: false,
              error: 'Failed to trigger CI/CD job: ' + triggerResult.error,
              deploymentId: deploymentResult.id
            };
          }
          
          console.log(`[ACTION:DEPLOYMENT] CI/CD job triggered successfully with build ID: ${triggerResult.data.id}`);
          console.log(`[ACTION:DEPLOYMENT] Build URL: ${triggerResult.data.url}`);
          
          // Update mapping with build ID and URL
          console.log('[ACTION:DEPLOYMENT] Updating mapping with build information...');
          try {
            await cicd.updateDeploymentCICDMapping(
              { id: mappingResult.data.id, tenant_id: tenantId },
              {
                status: 'running',
                build_id: triggerResult.data.id,
                build_url: triggerResult.data.url
              }
            );
            console.log('[ACTION:DEPLOYMENT] Mapping updated successfully');
          } catch (updateError) {
            console.error('[ACTION:DEPLOYMENT] Failed to update mapping with build information:', updateError);
          }
          
          // Update deployment status
          console.log('[ACTION:DEPLOYMENT] Updating deployment status to in_progress...');
          try {
            await deployment.update({
              where: { id: deploymentResult.id },
              data: { status: 'in_progress' }
            });
            console.log('[ACTION:DEPLOYMENT] Deployment status updated to in_progress');
          } catch (updateError) {
            console.error('[ACTION:DEPLOYMENT] Failed to update deployment status:', updateError);
          }
        } catch (mappingError) {
          console.error('[ACTION:DEPLOYMENT] Exception in Jenkins integration flow:', mappingError);
          console.error('[ACTION:DEPLOYMENT] Stack trace:', mappingError.stack);
          
          // Try to update deployment with error
          try {
            await deployment.update({
              where: { id: deploymentResult.id },
              data: { status: 'error', error_message: 'Exception in CI/CD integration: ' + mappingError.message }
            });
          } catch (updateError) {
            console.error('[ACTION:DEPLOYMENT] Failed to update deployment with error status:', updateError);
          }
          
          return {
            success: false,
            error: 'Exception in CI/CD integration: ' + mappingError.message,
            deploymentId: deploymentResult.id
          };
        }
      } else {
        console.log('[ACTION:DEPLOYMENT] Jenkins integration not enabled or missing configuration');
      }
      
      console.log(`[ACTION:DEPLOYMENT] Deployment creation completed successfully: ${deploymentResult.id}`);
      console.log('[ACTION:DEPLOYMENT] ====== END: Create Deployment ======');
      
      return { 
        success: true,
        deploymentId: deploymentResult.id
      };
    } catch (dbError) {
      console.error('[ACTION:DEPLOYMENT] Database error creating deployment:', dbError);
      console.error('[ACTION:DEPLOYMENT] Stack trace:', dbError.stack);
      return {
        success: false,
        error: 'Database error: ' + dbError.message
      };
    }
  } catch (error: any) {
    console.error('[ACTION:DEPLOYMENT] Unhandled exception in createDeployment:', error);
    console.error('[ACTION:DEPLOYMENT] Stack trace:', error.stack);
    console.log('[ACTION:DEPLOYMENT] ====== END: Create Deployment (ERROR) ======');
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
    const sessionResult = await getSupabaseSession();
    if (!sessionResult.success || !sessionResult.data?.user) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const session = sessionResult.data;
    const tenantId = session.user.tenant_id || '';
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
    const sessionResult = await getSupabaseSession();
    if (!sessionResult.success || !sessionResult.data?.user) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const session = sessionResult.data;
    const tenantId = session.user.tenant_id || '';
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