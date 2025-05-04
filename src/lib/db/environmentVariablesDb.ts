/**
 * Environment Variables Database Layer
 * Handles database operations for environment variables
 */
import { createClient } from '@/lib/supabase/server';
import { DbResponse } from '@/lib/utils/commonUtils';
import { EnvironmentVariable } from '@/types/context/environmentVariablesContextType';
import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

/**
 * Get all environment variables for a specific team
 */
export async function getEnvironmentVariablesByTeamId(
  teamId: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<EnvironmentVariable[]>> {
  try {
    console.log(
      `[@db:environmentVariablesDb:getEnvironmentVariablesByTeamId] Fetching for team: ${teamId}`,
    );

    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('environment_variables')
      .select('*')
      .eq('team_id', teamId)
      .order('key', { ascending: true });

    if (error) {
      console.error(
        `[@db:environmentVariablesDb:getEnvironmentVariablesByTeamId] Error: ${error.message}`,
      );
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(
      `[@db:environmentVariablesDb:getEnvironmentVariablesByTeamId] Successfully fetched ${data.length} variables`,
    );

    return {
      success: true,
      data: data as EnvironmentVariable[],
    };
  } catch (error) {
    console.error(
      `[@db:environmentVariablesDb:getEnvironmentVariablesByTeamId] Exception: ${error}`,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Get a specific environment variable by ID
 */
export async function getEnvironmentVariableById(
  id: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<EnvironmentVariable>> {
  try {
    console.log(`[@db:environmentVariablesDb:getEnvironmentVariableById] Fetching variable: ${id}`);

    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('environment_variables')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(
        `[@db:environmentVariablesDb:getEnvironmentVariableById] Error: ${error.message}`,
      );
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(
      `[@db:environmentVariablesDb:getEnvironmentVariableById] Successfully fetched variable: ${id}`,
    );

    return {
      success: true,
      data: data as EnvironmentVariable,
    };
  } catch (error) {
    console.error(`[@db:environmentVariablesDb:getEnvironmentVariableById] Exception: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Create a new environment variable
 */
export async function createEnvironmentVariable(
  variable: {
    key: string;
    value: string;
    description?: string;
    team_id: string;
    created_by: string;
  },
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<EnvironmentVariable>> {
  try {
    console.log(
      `[@db:environmentVariablesDb:createEnvironmentVariable] Creating variable: ${variable.key}`,
    );

    const supabase = await createClient(cookieStore);

    // Check if a variable with this key already exists for this team
    const { data: existingVar, error: checkError } = await supabase
      .from('environment_variables')
      .select('id')
      .eq('team_id', variable.team_id)
      .eq('key', variable.key)
      .maybeSingle();

    if (checkError) {
      console.error(
        `[@db:environmentVariablesDb:createEnvironmentVariable] Error checking for existing variable: ${checkError.message}`,
      );
      return {
        success: false,
        error: checkError.message,
      };
    }

    if (existingVar) {
      console.error(
        `[@db:environmentVariablesDb:createEnvironmentVariable] Variable with key "${variable.key}" already exists`,
      );
      return {
        success: false,
        error: `Environment variable with key "${variable.key}" already exists`,
      };
    }

    // Debug logging
    console.log(`[@db:environmentVariablesDb:createEnvironmentVariable] Insert data:`, {
      key: variable.key,
      description: variable.description || null,
      team_id: variable.team_id,
      created_by: variable.created_by,
      // Don't log the actual value for security, just log if it exists
      value_exists: !!variable.value,
    });

    // Insert the new variable
    const { data, error } = await supabase
      .from('environment_variables')
      .insert({
        key: variable.key,
        value: variable.value,
        description: variable.description || null,
        team_id: variable.team_id,
        created_by: variable.created_by,
      })
      .select('*')
      .single();

    if (error) {
      console.error(
        `[@db:environmentVariablesDb:createEnvironmentVariable] Error: ${error.message}`,
      );
      // Log more detailed error info if available
      if (error.details) {
        console.error(`Error details: ${error.details}`);
      }
      if (error.hint) {
        console.error(`Error hint: ${error.hint}`);
      }
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(
      `[@db:environmentVariablesDb:createEnvironmentVariable] Successfully created variable: ${data.id}`,
    );

    return {
      success: true,
      data: data as EnvironmentVariable,
    };
  } catch (error) {
    console.error(`[@db:environmentVariablesDb:createEnvironmentVariable] Exception: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Create multiple environment variables in a single batch operation
 */
export async function createEnvironmentVariablesBatch(
  variables: Array<{
    key: string;
    value: string;
    description?: string;
    team_id: string;
    created_by: string;
  }>,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<EnvironmentVariable[]>> {
  try {
    if (!variables.length) {
      return {
        success: true,
        data: [],
      };
    }

    console.log(
      `[@db:environmentVariablesDb:createEnvironmentVariablesBatch] Creating ${variables.length} variables in batch`,
    );

    const supabase = await createClient(cookieStore);
    const teamId = variables[0].team_id; // All variables should be for the same team

    // Check for existing keys
    const keys = variables.map((v) => v.key);
    console.log(
      `[@db:environmentVariablesDb:createEnvironmentVariablesBatch] Checking keys: ${keys.join(', ')}`,
    );

    const { data: existingVars, error: checkError } = await supabase
      .from('environment_variables')
      .select('key')
      .eq('team_id', teamId)
      .in('key', keys);

    if (checkError) {
      console.error(
        `[@db:environmentVariablesDb:createEnvironmentVariablesBatch] Error checking for existing variables: ${checkError.message}`,
      );
      return {
        success: false,
        error: checkError.message,
      };
    }

    // Filter out variables that already exist
    const existingKeys = existingVars?.map((v) => v.key) || [];

    if (existingKeys.length) {
      console.log(
        `[@db:environmentVariablesDb:createEnvironmentVariablesBatch] Found ${existingKeys.length} existing keys: ${existingKeys.join(', ')}`,
      );
    }

    const newVariables = variables.filter((v) => !existingKeys.includes(v.key));

    if (newVariables.length === 0) {
      console.error(
        `[@db:environmentVariablesDb:createEnvironmentVariablesBatch] All variables already exist`,
      );
      return {
        success: false,
        error: 'All environment variables already exist',
      };
    }

    // Debug log the insertion data (without actual values for security)
    console.log(
      `[@db:environmentVariablesDb:createEnvironmentVariablesBatch] Inserting ${newVariables.length} variables:`,
      newVariables.map((v) => ({
        key: v.key,
        team_id: v.team_id,
        created_by: v.created_by,
        value_exists: !!v.value,
      })),
    );

    // Insert all variables in a single operation
    const { data, error } = await supabase
      .from('environment_variables')
      .insert(newVariables)
      .select('*');

    if (error) {
      console.error(
        `[@db:environmentVariablesDb:createEnvironmentVariablesBatch] Error: ${error.message}`,
      );
      // Log more detailed error info if available
      if (error.details) {
        console.error(`Error details: ${error.details}`);
      }
      if (error.hint) {
        console.error(`Error hint: ${error.hint}`);
      }
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(
      `[@db:environmentVariablesDb:createEnvironmentVariablesBatch] Successfully created ${data.length} variables`,
    );

    return {
      success: true,
      data: data as EnvironmentVariable[],
    };
  } catch (error) {
    console.error(
      `[@db:environmentVariablesDb:createEnvironmentVariablesBatch] Exception: ${error}`,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Get shared environment variables for a specific tenant
 */
export async function getSharedEnvironmentVariablesByTenantId(
  tenantId: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<EnvironmentVariable[]>> {
  try {
    console.log(
      `[@db:environmentVariablesDb:getSharedEnvironmentVariablesByTenantId] Fetching for tenant: ${tenantId}`,
    );

    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('shared_environment_variables')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('key', { ascending: true });

    if (error) {
      console.error(
        `[@db:environmentVariablesDb:getSharedEnvironmentVariablesByTenantId] Error: ${error.message}`,
      );
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(
      `[@db:environmentVariablesDb:getSharedEnvironmentVariablesByTenantId] Successfully fetched ${data.length} variables`,
    );

    return {
      success: true,
      data: data as EnvironmentVariable[],
    };
  } catch (error) {
    console.error(
      `[@db:environmentVariablesDb:getSharedEnvironmentVariablesByTenantId] Exception: ${error}`,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Get tenant ID by team ID
 */
export async function getTenantIdByTeamId(
  teamId: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<string>> {
  try {
    console.log(
      `[@db:environmentVariablesDb:getTenantIdByTeamId] Fetching tenant ID for team: ${teamId}`,
    );

    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('teams')
      .select('tenant_id')
      .eq('id', teamId)
      .single();

    if (error) {
      console.error(`[@db:environmentVariablesDb:getTenantIdByTeamId] Error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(
      `[@db:environmentVariablesDb:getTenantIdByTeamId] Successfully fetched tenant ID for team: ${teamId}`,
    );

    return {
      success: true,
      data: data.tenant_id,
    };
  } catch (error) {
    console.error(`[@db:environmentVariablesDb:getTenantIdByTeamId] Exception: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Get all environment variables for a team, including shared variables from the tenant
 */
export async function getAllEnvironmentVariables(
  teamId: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<EnvironmentVariable[]>> {
  try {
    console.log(
      `[@db:environmentVariablesDb:getAllEnvironmentVariables] Fetching all variables for team: ${teamId}`,
    );

    // Fetch team-specific variables
    const teamResult = await getEnvironmentVariablesByTeamId(teamId, cookieStore);
    if (!teamResult.success) {
      console.error(
        `[@db:environmentVariablesDb:getAllEnvironmentVariables] Error fetching team variables: ${teamResult.error}`,
      );
      return teamResult;
    }

    // Fetch tenant ID for shared variables
    const tenantResult = await getTenantIdByTeamId(teamId, cookieStore);
    if (!tenantResult.success) {
      console.error(
        `[@db:environmentVariablesDb:getAllEnvironmentVariables] Error fetching tenant ID: ${tenantResult.error}`,
      );
      return tenantResult;
    }

    const tenantId = tenantResult.data;
    const sharedResult = await getSharedEnvironmentVariablesByTenantId(tenantId, cookieStore);
    if (!sharedResult.success) {
      console.error(
        `[@db:environmentVariablesDb:getAllEnvironmentVariables] Error fetching shared variables: ${sharedResult.error}`,
      );
      return sharedResult;
    }

    const teamVariables = teamResult.data;
    const sharedVariables = sharedResult.data;

    // Combine variables, prioritizing team-specific over shared for duplicate keys
    const combinedVariables: EnvironmentVariable[] = [...teamVariables];
    const teamKeys = new Set(teamVariables.map((v) => v.key));

    sharedVariables.forEach((sharedVar) => {
      if (!teamKeys.has(sharedVar.key)) {
        combinedVariables.push(sharedVar);
      }
    });

    console.log(
      `[@db:environmentVariablesDb:getAllEnvironmentVariables] Successfully combined ${combinedVariables.length} variables (team: ${teamVariables.length}, shared: ${sharedVariables.length}) for team: ${teamId}`,
    );

    return {
      success: true,
      data: combinedVariables,
    };
  } catch (error) {
    console.error(`[@db:environmentVariablesDb:getAllEnvironmentVariables] Exception: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Create a new shared environment variable for a tenant
 */
export async function createSharedEnvironmentVariable(
  variable: {
    key: string;
    value: string;
    description?: string;
    tenant_id: string;
    created_by: string;
  },
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<EnvironmentVariable>> {
  try {
    console.log(
      `[@db:environmentVariablesDb:createSharedEnvironmentVariable] Creating shared variable: ${variable.key}`,
    );

    const supabase = await createClient(cookieStore);

    // Check if a variable with this key already exists for this tenant
    const { data: existingVar, error: checkError } = await supabase
      .from('shared_environment_variables')
      .select('id')
      .eq('tenant_id', variable.tenant_id)
      .eq('key', variable.key)
      .maybeSingle();

    if (checkError) {
      console.error(
        `[@db:environmentVariablesDb:createSharedEnvironmentVariable] Error checking for existing variable: ${checkError.message}`,
      );
      return {
        success: false,
        error: checkError.message,
      };
    }

    if (existingVar) {
      console.error(
        `[@db:environmentVariablesDb:createSharedEnvironmentVariable] Shared variable with key "${variable.key}" already exists`,
      );
      return {
        success: false,
        error: `Shared environment variable with key "${variable.key}" already exists`,
      };
    }

    // Debug logging
    console.log(`[@db:environmentVariablesDb:createSharedEnvironmentVariable] Insert data:`, {
      key: variable.key,
      description: variable.description || null,
      tenant_id: variable.tenant_id,
      created_by: variable.created_by,
      // Don't log the actual value for security, just log if it exists
      value_exists: !!variable.value,
    });

    // Insert the new shared variable
    const { data, error } = await supabase
      .from('shared_environment_variables')
      .insert({
        key: variable.key,
        value: variable.value,
        description: variable.description || null,
        tenant_id: variable.tenant_id,
        created_by: variable.created_by,
      })
      .select('*')
      .single();

    if (error) {
      console.error(
        `[@db:environmentVariablesDb:createSharedEnvironmentVariable] Error: ${error.message}`,
      );
      // Log more detailed error info if available
      if (error.details) {
        console.error(`Error details: ${error.details}`);
      }
      if (error.hint) {
        console.error(`Error hint: ${error.hint}`);
      }
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(
      `[@db:environmentVariablesDb:createSharedEnvironmentVariable] Successfully created shared variable: ${data.id}`,
    );

    return {
      success: true,
      data: data as EnvironmentVariable,
    };
  } catch (error) {
    console.error(
      `[@db:environmentVariablesDb:createSharedEnvironmentVariable] Exception: ${error}`,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Create multiple shared environment variables in a single batch operation
 */
export async function createSharedEnvironmentVariablesBatch(
  variables: Array<{
    key: string;
    value: string;
    description?: string;
    tenant_id: string;
    created_by: string;
  }>,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<EnvironmentVariable[]>> {
  try {
    if (!variables.length) {
      return {
        success: true,
        data: [],
      };
    }

    console.log(
      `[@db:environmentVariablesDb:createSharedEnvironmentVariablesBatch] Creating ${variables.length} shared variables in batch`,
    );

    const supabase = await createClient(cookieStore);
    const tenantId = variables[0].tenant_id; // All variables should be for the same tenant

    // Check for existing keys
    const keys = variables.map((v) => v.key);
    console.log(
      `[@db:environmentVariablesDb:createSharedEnvironmentVariablesBatch] Checking keys: ${keys.join(', ')}`,
    );

    const { data: existingVars, error: checkError } = await supabase
      .from('shared_environment_variables')
      .select('key')
      .eq('tenant_id', tenantId)
      .in('key', keys);

    if (checkError) {
      console.error(
        `[@db:environmentVariablesDb:createSharedEnvironmentVariablesBatch] Error checking for existing variables: ${checkError.message}`,
      );
      return {
        success: false,
        error: checkError.message,
      };
    }

    // Filter out variables that already exist
    const existingKeys = existingVars?.map((v) => v.key) || [];

    if (existingKeys.length) {
      console.log(
        `[@db:environmentVariablesDb:createSharedEnvironmentVariablesBatch] Found ${existingKeys.length} existing keys: ${existingKeys.join(', ')}`,
      );
    }

    const newVariables = variables.filter((v) => !existingKeys.includes(v.key));

    if (newVariables.length === 0) {
      console.error(
        `[@db:environmentVariablesDb:createSharedEnvironmentVariablesBatch] All shared variables already exist`,
      );
      return {
        success: false,
        error: 'All shared environment variables already exist',
      };
    }

    // Debug log the insertion data (without actual values for security)
    console.log(
      `[@db:environmentVariablesDb:createSharedEnvironmentVariablesBatch] Inserting ${newVariables.length} shared variables:`,
      newVariables.map((v) => ({
        key: v.key,
        tenant_id: v.tenant_id,
        created_by: v.created_by,
        value_exists: !!v.value,
      })),
    );

    // Insert all variables in a single operation
    const { data, error } = await supabase
      .from('shared_environment_variables')
      .insert(newVariables)
      .select('*');

    if (error) {
      console.error(
        `[@db:environmentVariablesDb:createSharedEnvironmentVariablesBatch] Error: ${error.message}`,
      );
      // Log more detailed error info if available
      if (error.details) {
        console.error(`Error details: ${error.details}`);
      }
      if (error.hint) {
        console.error(`Error hint: ${error.hint}`);
      }
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(
      `[@db:environmentVariablesDb:createSharedEnvironmentVariablesBatch] Successfully created ${data.length} shared variables`,
    );

    return {
      success: true,
      data: data as EnvironmentVariable[],
    };
  } catch (error) {
    console.error(
      `[@db:environmentVariablesDb:createSharedEnvironmentVariablesBatch] Exception: ${error}`,
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Determine the origin table of an environment variable by ID
 */
export async function getEnvironmentVariableOrigin(
  variableId: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<
  DbResponse<{
    table: 'environment_variables' | 'shared_environment_variables';
    team_id?: string;
    tenant_id?: string;
  }>
> {
  try {
    console.log(
      `[@db:environmentVariablesDb:getEnvironmentVariableOrigin] Determining origin for variable: ${variableId}`,
    );

    const supabase = await createClient(cookieStore);

    // Check in environment_variables table
    const { data: teamVar, error: teamError } = await supabase
      .from('environment_variables')
      .select('team_id')
      .eq('id', variableId)
      .maybeSingle();

    if (teamError && teamError.code !== 'PGRST116') {
      console.error(
        `[@db:environmentVariablesDb:getEnvironmentVariableOrigin] Error checking team variables: ${teamError.message}`,
      );
      return {
        success: false,
        error: teamError.message,
      };
    }

    if (teamVar) {
      console.log(
        `[@db:environmentVariablesDb:getEnvironmentVariableOrigin] Variable ${variableId} found in environment_variables`,
      );
      return {
        success: true,
        data: { table: 'environment_variables', team_id: teamVar.team_id },
      };
    }

    // Check in shared_environment_variables table
    const { data: sharedVar, error: sharedError } = await supabase
      .from('shared_environment_variables')
      .select('tenant_id')
      .eq('id', variableId)
      .maybeSingle();

    if (sharedError && sharedError.code !== 'PGRST116') {
      console.error(
        `[@db:environmentVariablesDb:getEnvironmentVariableOrigin] Error checking shared variables: ${sharedError.message}`,
      );
      return {
        success: false,
        error: sharedError.message,
      };
    }

    if (sharedVar) {
      console.log(
        `[@db:environmentVariablesDb:getEnvironmentVariableOrigin] Variable ${variableId} found in shared_environment_variables`,
      );
      return {
        success: true,
        data: { table: 'shared_environment_variables', tenant_id: sharedVar.tenant_id },
      };
    }

    console.error(
      `[@db:environmentVariablesDb:getEnvironmentVariableOrigin] Variable ${variableId} not found in either table`,
    );
    return {
      success: false,
      error: 'Variable not found',
    };
  } catch (error) {
    console.error(`[@db:environmentVariablesDb:getEnvironmentVariableOrigin] Exception: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Update an existing environment variable in either table
 */
export async function updateEnvironmentVariable(
  id: string,
  updates: {
    key?: string;
    value?: string;
    description?: string;
  },
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<EnvironmentVariable>> {
  try {
    console.log(`[@db:environmentVariablesDb:updateEnvironmentVariable] Updating variable: ${id}`);

    const supabase = await createClient(cookieStore);

    // Determine which table the variable belongs to
    const originResult = await getEnvironmentVariableOrigin(id, cookieStore);
    if (!originResult.success) {
        console.error(
        `[@db:environmentVariablesDb:updateEnvironmentVariable] Error determining variable origin: ${originResult.error}`,
        );
        return {
          success: false,
        error: originResult.error,
      };
    }

    const { table, team_id, tenant_id } = originResult.data;

    // If updating key, check for conflicts in the same table
    if (updates.key) {
      if (table === 'environment_variables' && team_id) {
        // Check for existing key in team variables
      const { data: existingVar, error: checkError } = await supabase
        .from('environment_variables')
        .select('id')
          .eq('team_id', team_id)
        .eq('key', updates.key)
          .neq('id', id)
        .maybeSingle();

      if (checkError) {
        console.error(
            `[@db:environmentVariablesDb:updateEnvironmentVariable] Error checking for existing team variable: ${checkError.message}`,
        );
        return {
          success: false,
          error: checkError.message,
        };
      }

      if (existingVar) {
        console.error(
            `[@db:environmentVariablesDb:updateEnvironmentVariable] Variable with key "${updates.key}" already exists in team variables`,
        );
        return {
          success: false,
          error: `Environment variable with key "${updates.key}" already exists`,
        };
        }
      } else if (table === 'shared_environment_variables' && tenant_id) {
        // Check for existing key in shared variables
        const { data: existingVar, error: checkError } = await supabase
          .from('shared_environment_variables')
          .select('id')
          .eq('tenant_id', tenant_id)
          .eq('key', updates.key)
          .neq('id', id)
          .maybeSingle();

        if (checkError) {
          console.error(
            `[@db:environmentVariablesDb:updateEnvironmentVariable] Error checking for existing shared variable: ${checkError.message}`,
          );
          return {
            success: false,
            error: checkError.message,
          };
        }

        if (existingVar) {
          console.error(
            `[@db:environmentVariablesDb:updateEnvironmentVariable] Variable with key "${updates.key}" already exists in shared variables`,
          );
          return {
            success: false,
            error: `Shared environment variable with key "${updates.key}" already exists`,
          };
        }
      }
    }

    // Update the variable in the correct table
    const { data, error } = await supabase
      .from(table)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error(
        `[@db:environmentVariablesDb:updateEnvironmentVariable] Error updating in ${table}: ${error.message}`,
      );
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(
      `[@db:environmentVariablesDb:updateEnvironmentVariable] Successfully updated variable: ${id} in ${table}`,
    );

    return {
      success: true,
      data: data as EnvironmentVariable,
    };
  } catch (error) {
    console.error(`[@db:environmentVariablesDb:updateEnvironmentVariable] Exception: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

/**
 * Delete an environment variable from either table
 */
export async function deleteEnvironmentVariable(
  id: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<null>> {
  try {
    console.log(`[@db:environmentVariablesDb:deleteEnvironmentVariable] Deleting variable: ${id}`);

    const supabase = await createClient(cookieStore);

    // Determine which table the variable belongs to
    const originResult = await getEnvironmentVariableOrigin(id, cookieStore);
    if (!originResult.success) {
      console.error(
        `[@db:environmentVariablesDb:deleteEnvironmentVariable] Error determining variable origin: ${originResult.error}`,
      );
      return {
        success: false,
        error: originResult.error,
      };
    }

    const { table } = originResult.data;

    // Delete from the correct table
    const { error } = await supabase.from(table).delete().eq('id', id);

    if (error) {
      console.error(
        `[@db:environmentVariablesDb:deleteEnvironmentVariable] Error deleting from ${table}: ${error.message}`,
      );
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(
      `[@db:environmentVariablesDb:deleteEnvironmentVariable] Successfully deleted variable: ${id} from ${table}`,
    );

    return {
      success: true,
      data: null,
    };
  } catch (error) {
    console.error(`[@db:environmentVariablesDb:deleteEnvironmentVariable] Exception: ${error}`);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

// Default export for all environment variables database operations
const environmentVariablesDb = {
  getEnvironmentVariablesByTeamId,
  getEnvironmentVariableById,
  createEnvironmentVariable,
  createEnvironmentVariablesBatch,
  updateEnvironmentVariable,
  deleteEnvironmentVariable,
  getSharedEnvironmentVariablesByTenantId,
  getTenantIdByTeamId,
  getAllEnvironmentVariables,
  createSharedEnvironmentVariable,
  createSharedEnvironmentVariablesBatch,
  getEnvironmentVariableOrigin,
};

export default environmentVariablesDb;
