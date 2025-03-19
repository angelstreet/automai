import { createClient } from '../server';
import { cookies } from 'next/headers';
import { DbResponse } from '../types';

// CI/CD related DB operations
const cicd = {
  // Get a CI/CD provider by ID or query parameters
  async getCICDProvider(
    options: { id?: string; tenant_id?: string; type?: string } = {}
  ): Promise<DbResponse<any>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      let query = supabase.from('cicd_providers').select('*');

      // Apply filters
      if (options.id) {
        query = query.eq('id', options.id);
      }
      
      if (options.tenant_id) {
        query = query.eq('tenant_id', options.tenant_id);
      }
      
      if (options.type) {
        query = query.eq('type', options.type);
      }

      // Execute the query
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching CI/CD provider:', error);
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: options.id ? (data.length > 0 ? data[0] : null) : data
      };
    } catch (error: any) {
      console.error('Error in getCICDProvider:', error);
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
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data: result, error } = await supabase
        .from('deployment_cicd_mappings')
        .insert({
          deployment_id: data.deployment_id,
          provider_id: data.provider_id,
          job_id: data.job_id,
          tenant_id: data.tenant_id,
          parameters: data.parameters || {},
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating deployment CI/CD mapping:', error);
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
      console.error('Error in createDeploymentCICDMapping:', error);
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