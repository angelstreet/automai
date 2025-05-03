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
    is_secret: boolean;
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
      is_secret: variable.is_secret,
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
        is_secret: variable.is_secret,
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
    is_secret: boolean;
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
        is_secret: v.is_secret,
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
 * Update an existing environment variable
 */
export async function updateEnvironmentVariable(
  id: string,
  updates: {
    key?: string;
    value?: string;
    description?: string;
    is_secret?: boolean;
  },
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<EnvironmentVariable>> {
  try {
    console.log(`[@db:environmentVariablesDb:updateEnvironmentVariable] Updating variable: ${id}`);

    const supabase = await createClient(cookieStore);

    // Check if we're updating the key, and if so, ensure it's unique
    if (updates.key) {
      // Get the current variable to check its team_id
      const { data: currentVar, error: getError } = await supabase
        .from('environment_variables')
        .select('team_id')
        .eq('id', id)
        .single();

      if (getError) {
        console.error(
          `[@db:environmentVariablesDb:updateEnvironmentVariable] Error fetching current variable: ${getError.message}`,
        );
        return {
          success: false,
          error: getError.message,
        };
      }

      // Check if another variable with this key exists for this team
      const { data: existingVar, error: checkError } = await supabase
        .from('environment_variables')
        .select('id')
        .eq('team_id', currentVar.team_id)
        .eq('key', updates.key)
        .neq('id', id) // Exclude current variable
        .maybeSingle();

      if (checkError) {
        console.error(
          `[@db:environmentVariablesDb:updateEnvironmentVariable] Error checking for existing variable: ${checkError.message}`,
        );
        return {
          success: false,
          error: checkError.message,
        };
      }

      if (existingVar) {
        console.error(
          `[@db:environmentVariablesDb:updateEnvironmentVariable] Variable with key "${updates.key}" already exists`,
        );
        return {
          success: false,
          error: `Environment variable with key "${updates.key}" already exists`,
        };
      }
    }

    // Update the variable
    const { data, error } = await supabase
      .from('environment_variables')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error(
        `[@db:environmentVariablesDb:updateEnvironmentVariable] Error: ${error.message}`,
      );
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(
      `[@db:environmentVariablesDb:updateEnvironmentVariable] Successfully updated variable: ${id}`,
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
 * Delete an environment variable
 */
export async function deleteEnvironmentVariable(
  id: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<null>> {
  try {
    console.log(`[@db:environmentVariablesDb:deleteEnvironmentVariable] Deleting variable: ${id}`);

    const supabase = await createClient(cookieStore);

    const { error } = await supabase.from('environment_variables').delete().eq('id', id);

    if (error) {
      console.error(
        `[@db:environmentVariablesDb:deleteEnvironmentVariable] Error: ${error.message}`,
      );
      return {
        success: false,
        error: error.message,
      };
    }

    console.log(
      `[@db:environmentVariablesDb:deleteEnvironmentVariable] Successfully deleted variable: ${id}`,
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
};

export default environmentVariablesDb;
