import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server';

// Deployment DB operations
const deployment = {
  async findMany(options: any = {}, cookieStore?: any) {
    console.log(
      '[@db:deployment:findMany] Finding many deployments with options:',
      JSON.stringify(options),
    );

    // Create client with provided cookie store or get a new one
    const supabase = await createClient(cookieStore);

    // Make sure to select all required fields explicitly
    let builder = supabase.from('deployments').select(`
      id,
      name,
      description,
      repository_id,
      status,
      user_id,
      created_at,
      started_at,
      completed_at,
      scheduled_time,
      schedule_type,
      cron_expression,
      repeat_count,
      scripts_path,
      scripts_parameters,
      host_ids,
      environment_vars,
      tenant_id
    `);

    // Apply filters if provided
    if (options.where) {
      console.log('[@db:deployment:findMany] Applying filters:', JSON.stringify(options.where));
      Object.entries(options.where).forEach(([key, value]) => {
        builder = builder.eq(key, value);
      });
    }

    // Apply ordering
    if (options.orderBy) {
      const [field, direction] = Object.entries(options.orderBy)[0];
      builder = builder.order(field as string, { ascending: direction === 'asc' });
    } else {
      builder = builder.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (options.take) {
      builder = builder.limit(options.take);
    }

    if (options.skip) {
      builder = builder.range(options.skip, options.skip + (options.take || 10) - 1);
    }

    // Execute the query
    const { data, error } = await builder;

    if (error) {
      console.error('[@db:deployment:findMany] Error querying deployments:', error);
      return [];
    }

    console.log('[@db:deployment:findMany] Found', data?.length || 0, 'deployments');
    return data || [];
  },

  async findUnique(id: string, cookieStore?: any) {
    // Create client with provided cookie store or get a new one
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('deployments')
      .select(
        `
      id,
      name,
      description,
      repository_id,
      status,
      user_id,
      created_at,
      started_at,
      completed_at,
      scheduled_time,
      schedule_type,
      cron_expression,
      repeat_count,
      scripts_path,
      scripts_parameters,
      host_ids,
      environment_vars,
      tenant_id
    `,
      )
      .eq('id', id)
      .single();

    if (error) {
      console.error('[@db:deployment:findUnique] Error finding deployment:', error);
      return null;
    }

    return data;
  },

  async create({ data }: { data: any }, cookieStore?: any): Promise<any> {
    console.log(
      '[@db:deployment:create] Creating deployment with data:',
      JSON.stringify(data, null, 2),
    );

    try {
      console.log('[@db:deployment:create] Creating Supabase client...');
      // Create client with provided cookie store or get a new one
      const supabase = await createClient(cookieStore);
      console.log('[@db:deployment:create] Supabase client created');

      const deploymentData = {
        name: data.name,
        description: data.description || '',
        repository_id: data.repository_id,
        scripts_path: data.scripts_path || [],
        scripts_parameters: data.scripts_parameters || [],
        host_ids: data.host_ids || [],
        status: data.status || 'pending',
        schedule_type: data.schedule_type || 'now',
        scheduled_time: data.scheduled_time || null,
        cron_expression: data.cron_expression || null,
        repeat_count: data.repeat_count || 0,
        environment_vars: data.environment_vars || [],
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        created_at: new Date().toISOString(),
      };

      console.log(
        '[@db:deployment:create] Final deployment data for insert:',
        JSON.stringify(deploymentData, null, 2),
      );

      const { data: result, error } = await supabase
        .from('deployments')
        .insert(deploymentData)
        .select()
        .single();

      if (error) {
        console.error('[@db:deployment:create] Error creating deployment:', error);
        return {
          success: false,
          error: `Failed to create deployment: ${error.message}`,
        };
      }

      console.log('[@db:deployment:create] Deployment created successfully with ID:', result.id);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[@db:deployment:create] Error creating deployment:', error);
      return {
        success: false,
        error: `Failed to create deployment: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  async update(id: string, data: any, cookieStore?: any) {
    console.log('[@db:deployment:update] Updating deployment with id:', id);
    console.log(
      '[@db:deployment:update] Updating deployment with data:',
      JSON.stringify(data, null, 2),
    );

    try {
      console.log('[@db:deployment:update] Creating Supabase client...');
      // Create client with provided cookie store or get a new one
      const supabase = await createClient(cookieStore);
      console.log('[@db:deployment:update] Supabase client created');

      // Prepare update data
      const updateData = {
        name: data.name,
        description: data.description,
        repository_id: data.repository_id,
        scripts_path: data.scripts_path,
        scripts_parameters: data.scripts_parameters,
        host_ids: data.host_ids,
        status: data.status,
        schedule_type: data.schedule_type,
        scheduled_time: data.scheduled_time,
        cron_expression: data.cron_expression,
        repeat_count: data.repeat_count,
        environment_vars: data.environment_vars,
      };

      console.log(
        '[@db:deployment:update] Final update data:',
        JSON.stringify(updateData, null, 2),
      );

      const { data: result, error } = await supabase
        .from('deployments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[@db:deployment:update] Error updating deployment:', error);
        return {
          success: false,
          error: `Failed to update deployment: ${error.message}`,
        };
      }

      console.log('[@db:deployment:update] Deployment updated successfully');
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[@db:deployment:update] Error updating deployment:', error);
      return {
        success: false,
        error: `Failed to update deployment: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  async delete(id: string, cookieStore?: any) {
    console.log('[@db:deployment:delete] Deleting deployment with id:', id);
    console.log('[@db:deployment:delete] cookieStore provided:', !!cookieStore);

    if (!id) {
      console.error('[@db:deployment:delete] Cannot delete deployment - ID is required');
      return {
        success: false,
        error: 'Deployment ID is required',
      };
    }

    try {
      console.log('[@db:deployment:delete] Creating Supabase client...');

      // Create client with provided cookie store or get a new one
      let supabase;
      try {
        if (cookieStore) {
          console.log('[@db:deployment:delete] Using provided cookieStore');
          supabase = await createClient(cookieStore);
        } else {
          console.log('[@db:deployment:delete] No cookieStore provided, creating new one');
          const newCookieStore = await cookies();
          supabase = await createClient(newCookieStore);
        }
        console.log('[@db:deployment:delete] Supabase client created successfully');
      } catch (clientError) {
        console.error('[@db:deployment:delete] Error creating Supabase client:', clientError);
        return {
          success: false,
          error: `Failed to create database client: ${clientError instanceof Error ? clientError.message : String(clientError)}`,
        };
      }

      // First verify the deployment exists
      console.log('[@db:deployment:delete] Checking if deployment exists...');
      let findResult;
      try {
        findResult = await supabase.from('deployments').select('id').eq('id', id).single();

        console.log(
          '[@db:deployment:delete] Find deployment result:',
          JSON.stringify(findResult, null, 2),
        );
      } catch (findError) {
        console.error('[@db:deployment:delete] Error querying deployment:', findError);
        return {
          success: false,
          error: `Failed to query deployment: ${findError instanceof Error ? findError.message : String(findError)}`,
        };
      }

      const { data: existingDeployment, error: findError } = findResult;

      if (findError || !existingDeployment) {
        console.error(
          '[@db:deployment:delete] Error finding deployment to delete:',
          findError?.message || 'Deployment not found',
        );
        return {
          success: false,
          error: `Failed to find deployment: ${findError?.message || 'Deployment not found'}`,
        };
      }

      console.log('[@db:deployment:delete] Found deployment to delete, proceeding with deletion');

      // If deployment exists, delete it
      console.log('[@db:deployment:delete] Executing delete operation...');
      let deleteResult;
      try {
        deleteResult = await supabase.from('deployments').delete().eq('id', id);

        console.log(
          '[@db:deployment:delete] Delete operation result:',
          JSON.stringify(deleteResult, null, 2),
        );
      } catch (deleteError) {
        console.error('[@db:deployment:delete] Exception during delete operation:', deleteError);
        return {
          success: false,
          error: `Exception during delete: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
        };
      }

      const { error } = deleteResult;

      if (error) {
        console.error('[@db:deployment:delete] Error deleting deployment:', error);
        return {
          success: false,
          error: `Failed to delete deployment: ${error.message}`,
        };
      }

      console.log('[@db:deployment:delete] Deployment deleted successfully');
      return {
        success: true,
      };
    } catch (error) {
      console.error('[@db:deployment:delete] Error deleting deployment:', error);
      console.error(
        '[@db:deployment:delete] Error stack:',
        error instanceof Error ? error.stack : 'No stack trace available',
      );
      return {
        success: false,
        error: `Failed to delete deployment: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

export default deployment;
