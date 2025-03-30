import { cookies } from 'next/headers';

import { createClient } from '../server';

// Deployment DB operations
const deployment = {
  async findMany(options: any = {}, cookieStore?: any) {
    console.log('[DB-DEPLOYMENT]: Finding many deployments with options:', JSON.stringify(options));

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
      console.log('Applying filters:', JSON.stringify(options.where));
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
      console.error('Error querying deployments:', error);
      return [];
    }

    console.log('[DB-DEPLOYMENT]: Found', data?.length || 0, 'deployments');
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
      console.error('Error finding deployment:', error);
      return null;
    }

    return data;
  },

  async create({ data }: { data: any }, cookieStore?: any): Promise<any> {
    console.log('[DB-DEPLOYMENT]: Creating deployment with data:', JSON.stringify(data, null, 2));

    try {
      console.log('[DB-DEPLOYMENT]: Creating Supabase client...');
      // Create client with provided cookie store or get a new one
      const supabase = await createClient(cookieStore);
      console.log('[DB-DEPLOYMENT]: Supabase client created');

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
        'DB layer: Final deployment data for insert:',
        JSON.stringify(deploymentData, null, 2),
      );

      const { data: result, error } = await supabase
        .from('deployments')
        .insert(deploymentData)
        .select()
        .single();

      if (error) {
        console.error('[DB-DEPLOYMENT]: Error creating deployment:', error);
        return {
          success: false,
          error: `Failed to create deployment: ${error.message}`,
        };
      }

      console.log('[DB-DEPLOYMENT]: Deployment created successfully with ID:', result.id);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[DB-DEPLOYMENT]: Error creating deployment:', error);
      return {
        success: false,
        error: `Failed to create deployment: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  async update(id: string, data: any, cookieStore?: any) {
    console.log('[DB-DEPLOYMENT]: Updating deployment with id:', id);
    console.log('[DB-DEPLOYMENT]: Updating deployment with data:', JSON.stringify(data, null, 2));

    try {
      console.log('[DB-DEPLOYMENT]: Creating Supabase client...');
      // Create client with provided cookie store or get a new one
      const supabase = await createClient(cookieStore);
      console.log('[DB-DEPLOYMENT]: Supabase client created');

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

      console.log('[DB-DEPLOYMENT]: Final update data:', JSON.stringify(updateData, null, 2));

      const { data: result, error } = await supabase
        .from('deployments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('[DB-DEPLOYMENT]: Error updating deployment:', error);
        return {
          success: false,
          error: `Failed to update deployment: ${error.message}`,
        };
      }

      console.log('[DB-DEPLOYMENT]: Deployment updated successfully');
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('[DB-DEPLOYMENT]: Error updating deployment:', error);
      return {
        success: false,
        error: `Failed to update deployment: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },

  async delete(id: string, cookieStore?: any) {
    console.log(`\n=======================================`);
    console.log(`DB layer: DELETE OPERATION START - Deployment ID: ${id}`);
    console.log(`=======================================`);

    console.log('[DB-DEPLOYMENT]: Deleting deployment with id:', id);
    console.log('[DB-DEPLOYMENT]: cookieStore provided:', !!cookieStore);

    if (!id) {
      console.error('[DB-DEPLOYMENT]: Cannot delete deployment - ID is required');
      return {
        success: false,
        error: 'Deployment ID is required',
      };
    }

    try {
      console.log('[DB-DEPLOYMENT]: Creating Supabase client...');

      // Create client with provided cookie store or get a new one
      let supabase;
      try {
        if (cookieStore) {
          console.log('[DB-DEPLOYMENT]: Using provided cookieStore');
          supabase = await createClient(cookieStore);
        } else {
          console.log('[DB-DEPLOYMENT]: No cookieStore provided, creating new one');
          const newCookieStore = await cookies();
          supabase = await createClient(newCookieStore);
        }
        console.log('[DB-DEPLOYMENT]: Supabase client created successfully');
      } catch (clientError) {
        console.error('[DB-DEPLOYMENT]: Error creating Supabase client:', clientError);
        return {
          success: false,
          error: `Failed to create database client: ${clientError instanceof Error ? clientError.message : String(clientError)}`,
        };
      }

      // First verify the deployment exists
      console.log('[DB-DEPLOYMENT]: Checking if deployment exists...');
      let findResult;
      try {
        findResult = await supabase.from('deployments').select('id').eq('id', id).single();

        console.log('[DB-DEPLOYMENT]: Find deployment result:', JSON.stringify(findResult, null, 2));
      } catch (findError) {
        console.error('[DB-DEPLOYMENT]: Error querying deployment:', findError);
        return {
          success: false,
          error: `Failed to query deployment: ${findError instanceof Error ? findError.message : String(findError)}`,
        };
      }

      const { data: existingDeployment, error: findError } = findResult;

      if (findError || !existingDeployment) {
        console.error(
          'DB layer: Error finding deployment to delete:',
          findError?.message || 'Deployment not found',
        );
        return {
          success: false,
          error: `Failed to find deployment: ${findError?.message || 'Deployment not found'}`,
        };
      }

      console.log('[DB-DEPLOYMENT]: Found deployment to delete, proceeding with deletion');

      // If deployment exists, delete it
      console.log('[DB-DEPLOYMENT]: Executing delete operation...');
      let deleteResult;
      try {
        deleteResult = await supabase.from('deployments').delete().eq('id', id);

        console.log('[DB-DEPLOYMENT]: Delete operation result:', JSON.stringify(deleteResult, null, 2));
      } catch (deleteError) {
        console.error('[DB-DEPLOYMENT]: Exception during delete operation:', deleteError);
        return {
          success: false,
          error: `Exception during delete: ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`,
        };
      }

      const { error } = deleteResult;

      if (error) {
        console.error('[DB-DEPLOYMENT]: Error deleting deployment:', error);
        return {
          success: false,
          error: `Failed to delete deployment: ${error.message}`,
        };
      }

      console.log('[DB-DEPLOYMENT]: Deployment deleted successfully');
      console.log(`\n=======================================`);
      console.log(`DB layer: DELETE OPERATION END - SUCCESS`);
      console.log(`=======================================`);
      return {
        success: true,
      };
    } catch (error) {
      console.error('[DB-DEPLOYMENT]: Error deleting deployment:', error);
      console.error(
        'DB layer: Error stack:',
        error instanceof Error ? error.stack : 'No stack trace available',
      );
      console.log(`\n=======================================`);
      console.log(`DB layer: DELETE OPERATION END - EXCEPTION`);
      console.log(`=======================================`);
      return {
        success: false,
        error: `Failed to delete deployment: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};

export default deployment;
