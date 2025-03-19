import { createClient } from '../server';
import { cookies } from 'next/headers';

// Deployment DB operations
const deployment = {
  async findMany(options: any = {}) {
    console.log('DB layer: Finding many deployments with options:', JSON.stringify(options));
    
    const cookieStore = await cookies();
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
      scripts_paths,
      scripts_parameters,
      host_ids,
      parameters,
      environment_vars,
      tenant_id,
      error_message
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

    console.log('DB layer: Found', data?.length || 0, 'deployments');
    return data || [];
  },

  async findUnique({ where }: { where: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase.from('deployments').select(`
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
      scripts_paths,
      scripts_parameters,
      host_ids,
      parameters,
      environment_vars,
      tenant_id,
      error_message
    `).match(where).single();

    if (error) {
      console.error('Error finding deployment:', error);
      return null;
    }

    return data;
  },

  async create({ data }: { data: any }): Promise<any> {
    console.log('DB layer: Creating deployment with data:', JSON.stringify(data, null, 2));
    
    try {
      console.log('DB layer: Creating Supabase client...');
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);
      console.log('DB layer: Supabase client created');
      
      const deploymentData = {
        name: data.name,
        description: data.description || '',
        repository_id: data.repository_id,
        scripts_paths: data.scripts_paths || [],
        scripts_parameters: data.scripts_parameters || [],
        host_ids: data.host_ids || [],
        status: data.status || 'pending',
        schedule_type: data.schedule_type || 'now',
        scheduled_time: data.scheduled_time || null,
        cron_expression: data.cron_expression || null,
        repeat_count: data.repeat_count || 0,
        parameters: data.parameters || {},
        environment_vars: data.environment_vars || [],
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        created_at: new Date().toISOString()
      };
      
      console.log('DB layer: Final deployment data for insert:', JSON.stringify(deploymentData, null, 2));
      
      const { data: result, error } = await supabase
        .from('deployments')
        .insert(deploymentData)
        .select()
        .single();
      
      if (error) {
        console.error('DB layer: Error creating deployment:', error);
        return {
          success: false,
          error: `Failed to create deployment: ${error.message}`
        };
      }
      
      console.log('DB layer: Deployment created successfully with ID:', result.id);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('DB layer: Error creating deployment:', error);
      return {
        success: false,
        error: `Failed to create deployment: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  },

  async update({ where, data }: { where: any; data: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    // Prepare update data
    const updateData = {
      name: data.name,
      description: data.description,
      repository_id: data.repository_id,
      scripts_paths: data.scripts_paths,
      scripts_parameters: data.scripts_parameters,
      host_ids: data.host_ids,
      status: data.status,
      schedule_type: data.schedule_type,
      scheduled_time: data.scheduled_time,
      cron_expression: data.cron_expression,
      repeat_count: data.repeat_count,
      parameters: data.parameters,
      environment_vars: data.environment_vars,
    };

    const { data: result, error } = await supabase
      .from('deployments')
      .update(updateData)
      .match(where)
      .select()
      .single();

    if (error) {
      console.error('Error updating deployment:', error);
      return {
        success: false,
        error
      };
    }

    console.log('DB layer: Deployment updated successfully with ID:', result?.id);
    return {
      success: true,
      id: result.id,
      data: result
    };
  },

  async delete({ where }: { where: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { error } = await supabase.from('deployments').delete().match(where);

    if (error) {
      console.error('Error deleting deployment:', error);
      return {
        success: false,
        error
      };
    }

    return { success: true };
  },
};

export default deployment;