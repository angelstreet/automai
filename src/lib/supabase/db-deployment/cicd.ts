import { createClient } from '../server';
import { cookies } from 'next/headers';
import { DbResponse } from '../types';

// CI/CD related DB operations
const cicd = {
  // Get a CI/CD provider by ID or query parameters
  async getCICDProvider(
    options: { id?: string; tenant_id?: string; type?: string } = {}
  ): Promise<DbResponse<any>> {
    console.log(`[DB:CICD] getCICDProvider called with options:`, JSON.stringify(options));
    
    try {
      console.log(`[DB:CICD] Creating Supabase client...`);
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
      console.log(`[DB:CICD] Supabase client created`);

      console.log(`[DB:CICD] Building query for cicd_providers table`);
      let query = supabase.from('cicd_providers').select('*');

      // Apply filters
      if (options.id) {
        console.log(`[DB:CICD] Filtering by ID: ${options.id}`);
        query = query.eq('id', options.id);
      }
      
      if (options.tenant_id) {
        console.log(`[DB:CICD] Filtering by tenant_id: ${options.tenant_id}`);
        query = query.eq('tenant_id', options.tenant_id);
      }
      
      if (options.type) {
        console.log(`[DB:CICD] Filtering by type: ${options.type}`);
        query = query.eq('type', options.type);
      }

      console.log(`[DB:CICD] Executing query for cicd_providers...`);
      // Execute the query
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error(`[DB:CICD] Error fetching CI/CD provider:`, error);
        console.error(`[DB:CICD] SQL error details:`, JSON.stringify({
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message
        }));
        return {
          success: false,
          error: error.message
        };
      }

      if (options.id) {
        if (data.length > 0) {
          console.log(`[DB:CICD] Found CI/CD provider with ID ${options.id}`);
          // Log provider details without sensitive information
          const providerData = { ...data[0] };
          if (providerData.config && providerData.config.credentials) {
            providerData.config = { 
              ...providerData.config, 
              credentials: { 
                ...providerData.config.credentials,
                token: providerData.config.credentials.token ? '[REDACTED]' : undefined,
                password: providerData.config.credentials.password ? '[REDACTED]' : undefined
              } 
            };
          }
          console.log(`[DB:CICD] Provider details:`, JSON.stringify(providerData));
        } else {
          console.warn(`[DB:CICD] No CI/CD provider found with ID ${options.id}`);
        }
      } else {
        console.log(`[DB:CICD] Found ${data.length} CI/CD providers`);
      }

      return {
        success: true,
        data: options.id ? (data.length > 0 ? data[0] : null) : data
      };
    } catch (error: any) {
      console.error(`[DB:CICD] Exception in getCICDProvider:`, error);
      console.error(`[DB:CICD] Error stack:`, error.stack);
      return {
        success: false,
        error: error.message || 'Failed to get CI/CD provider'
      };
    }
  },

  // Get CI/CD jobs by provider ID or other query parameters
  async getCICDJobs(
    options: { provider_id?: string; tenant_id?: string; status?: string } = {}
  ): Promise<DbResponse<any>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      let query = supabase.from('cicd_jobs').select('*');

      // Apply filters
      if (options.provider_id) {
        query = query.eq('provider_id', options.provider_id);
      }
      
      if (options.tenant_id) {
        query = query.eq('tenant_id', options.tenant_id);
      }
      
      if (options.status) {
        query = query.eq('status', options.status);
      }

      // Execute the query
      const { data, error } = await query.order('name', { ascending: true });

      if (error) {
        console.error('Error fetching CI/CD jobs:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      console.error('Error in getCICDJobs:', error);
      return {
        success: false,
        error: error.message || 'Failed to get CI/CD jobs'
      };
    }
  },

  // Create a new deployment mapping to CI/CD job
  async createDeploymentCICDMapping(
    data: {
      deployment_id: string;
      provider_id: string;
      job_id: string;
      tenant_id: string;
      parameters?: Record<string, any>;
    }
  ): Promise<DbResponse<any>> {
    console.log(`[DB:CICD] createDeploymentCICDMapping called with data:`, JSON.stringify({
      deployment_id: data.deployment_id,
      provider_id: data.provider_id,
      job_id: data.job_id,
      tenant_id: data.tenant_id,
      parameters: data.parameters ? Object.keys(data.parameters) : '{}',
    }));
    
    try {
      console.log(`[DB:CICD] Creating Supabase client for deployment CICD mapping...`);
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
      console.log(`[DB:CICD] Supabase client created for mapping`);

      const insertData = {
        deployment_id: data.deployment_id,
        provider_id: data.provider_id,
        job_id: data.job_id,
        tenant_id: data.tenant_id,
        parameters: data.parameters || {},
        status: 'pending',
        created_at: new Date().toISOString()
      };
      
      console.log(`[DB:CICD] Inserting CICD mapping into deployment_cicd_mappings table...`);
      console.log(`[DB:CICD] Insert data:`, JSON.stringify(insertData));
      
      const { data: result, error } = await supabase
        .from('deployment_cicd_mappings')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error(`[DB:CICD] Error creating deployment CI/CD mapping:`, error);
        console.error(`[DB:CICD] SQL error details:`, JSON.stringify({
          code: error.code,
          details: error.details,
          hint: error.hint,
          message: error.message
        }));
        
        // Check if it's a foreign key constraint error
        if (error.code === '23503') { // Foreign key violation
          console.error(`[DB:CICD] Foreign key constraint error - check if provider_id, deployment_id and job_id exist`);
          
          // Try to get more info about the related records
          try {
            console.log(`[DB:CICD] Checking if provider exists...`);
            const providerCheck = await supabase
              .from('cicd_providers')
              .select('id')
              .eq('id', data.provider_id)
              .eq('tenant_id', data.tenant_id)
              .single();
              
            console.log(`[DB:CICD] Provider check result:`, JSON.stringify({
              provider_exists: !providerCheck.error,
              provider_id: data.provider_id
            }));
            
            console.log(`[DB:CICD] Checking if deployment exists...`);
            const deploymentCheck = await supabase
              .from('deployments')
              .select('id')
              .eq('id', data.deployment_id)
              .eq('tenant_id', data.tenant_id)
              .single();
              
            console.log(`[DB:CICD] Deployment check result:`, JSON.stringify({
              deployment_exists: !deploymentCheck.error,
              deployment_id: data.deployment_id
            }));
          } catch (checkError) {
            console.error(`[DB:CICD] Error during record existence checks:`, checkError);
          }
        }
        
        return {
          success: false,
          error: error.message
        };
      }

      console.log(`[DB:CICD] Successfully created deployment CICD mapping with ID: ${result.id}`);
      console.log(`[DB:CICD] Mapping details:`, JSON.stringify(result));
      
      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error(`[DB:CICD] Exception in createDeploymentCICDMapping:`, error);
      console.error(`[DB:CICD] Error stack:`, error.stack);
      
      // Check if the table exists
      try {
        console.log(`[DB:CICD] Checking if deployment_cicd_mappings table exists...`);
        const cookieStore = await cookies();
        const supabase = await createClient(cookieStore);
        
        const { data, error: tableError } = await supabase.rpc('table_exists', { 
          table_name: 'deployment_cicd_mappings'
        });
        
        console.log(`[DB:CICD] Table existence check result:`, JSON.stringify({
          table_exists: data,
          error: tableError
        }));
      } catch (tableCheckError) {
        console.error(`[DB:CICD] Error checking table existence:`, tableCheckError);
      }
      
      return {
        success: false,
        error: error.message || 'Failed to create deployment CI/CD mapping'
      };
    }
  },

  // Update an existing deployment CI/CD mapping
  async updateDeploymentCICDMapping(
    where: { id: string; tenant_id: string },
    data: {
      status?: string;
      build_id?: string;
      build_url?: string;
      build_logs?: string;
      updated_at?: string;
    }
  ): Promise<DbResponse<any>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Ensure tenant isolation
      if (!where.tenant_id) {
        return {
          success: false,
          error: 'Tenant ID is required for security'
        };
      }

      const updateData = {
        ...data,
        updated_at: data.updated_at || new Date().toISOString()
      };

      const { data: result, error } = await supabase
        .from('deployment_cicd_mappings')
        .update(updateData)
        .match({
          id: where.id,
          tenant_id: where.tenant_id
        })
        .select()
        .single();

      if (error) {
        console.error('Error updating deployment CI/CD mapping:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      console.error('Error in updateDeploymentCICDMapping:', error);
      return {
        success: false,
        error: error.message || 'Failed to update deployment CI/CD mapping'
      };
    }
  },

  // Get deployment CI/CD mapping by ID or deployment ID
  async getDeploymentCICDMapping(
    options: { id?: string; deployment_id?: string; tenant_id: string }
  ): Promise<DbResponse<any>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Ensure tenant isolation
      if (!options.tenant_id) {
        return {
          success: false,
          error: 'Tenant ID is required for security'
        };
      }

      let query = supabase
        .from('deployment_cicd_mappings')
        .select(`
          *,
          cicd_providers:provider_id (*),
          cicd_jobs:job_id (*)
        `)
        .eq('tenant_id', options.tenant_id);

      // Apply additional filters
      if (options.id) {
        query = query.eq('id', options.id);
      }
      
      if (options.deployment_id) {
        query = query.eq('deployment_id', options.deployment_id);
      }

      // Execute query
      const { data, error } = await query;

      if (error) {
        console.error('Error fetching deployment CI/CD mapping:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: options.id || options.deployment_id ? (data.length > 0 ? data[0] : null) : data
      };
    } catch (error: any) {
      console.error('Error in getDeploymentCICDMapping:', error);
      return {
        success: false,
        error: error.message || 'Failed to get deployment CI/CD mapping'
      };
    }
  }
};

export default cicd;