// environmentVariablesAction.ts
'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { getUser } from '@/app/actions/userAction';
import * as environmentVariablesDb from '@/lib/db/environmentVariablesDb';
import { encryptValue, decryptValue } from '@/lib/utils/encryptionUtils';

/**
 * Get all environment variables for a team
 */
export const getTeamEnvironmentVariables = cache(async (teamId: string) => {
  try {
    console.log(
      `[@action:environmentVariablesAction:getTeamEnvironmentVariables] Starting for team: ${teamId}`,
    );

    // Verify user is authenticated
    const user = await getUser();
    if (!user) {
      console.error(
        '[@action:environmentVariablesAction:getTeamEnvironmentVariables] User not authenticated',
      );
      return { success: false, error: 'User not authenticated' };
    }

    const cookieStore = await cookies();

    // Call database layer to get environment variables
    const result = await environmentVariablesDb.getEnvironmentVariablesByTeamId(
      teamId,
      cookieStore,
    );

    if (!result.success) {
      console.error(
        '[@action:environmentVariablesAction:getTeamEnvironmentVariables] Error:',
        result.error,
      );
      return { success: false, error: result.error || 'Failed to fetch environment variables' };
    }

    // Decrypt sensitive values before returning
    const decryptedVariables =
      result.data?.map((variable) => ({
        ...variable,
        value: variable.is_secret ? decryptValue(variable.value) : variable.value,
      })) || [];

    console.log(
      `[@action:environmentVariablesAction:getTeamEnvironmentVariables] Successfully fetched ${decryptedVariables.length} variables for team: ${teamId}`,
    );

    return {
      success: true,
      data: decryptedVariables,
    };
  } catch (error) {
    console.error('[@action:environmentVariablesAction:getTeamEnvironmentVariables] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch environment variables',
    };
  }
});

/**
 * Create a new environment variable for a team
 */
export const createEnvironmentVariable = cache(
  async (
    teamId: string,
    variable: {
      key: string;
      value: string;
      description?: string;
      is_secret: boolean;
    },
  ) => {
    try {
      console.log(
        `[@action:environmentVariablesAction:createEnvironmentVariable] Creating variable for team: ${teamId}`,
      );

      // Verify user is authenticated
      const user = await getUser();
      if (!user) {
        console.error(
          '[@action:environmentVariablesAction:createEnvironmentVariable] User not authenticated',
        );
        return { success: false, error: 'User not authenticated' };
      }

      const cookieStore = await cookies();

      // Encrypt value if it's a secret
      const processedVariable = {
        ...variable,
        value: variable.is_secret ? encryptValue(variable.value) : variable.value,
        team_id: teamId,
        created_by: user.id,
      };

      // Debug log the auth context
      console.log(
        `[@action:environmentVariablesAction:createEnvironmentVariable] User ID: ${user.id}, Team ID: ${teamId}`,
      );

      // Call database layer to create environment variable
      const result = await environmentVariablesDb.createEnvironmentVariable(
        processedVariable,
        cookieStore,
      );

      if (!result.success) {
        console.error(
          '[@action:environmentVariablesAction:createEnvironmentVariable] Error:',
          result.error,
        );
        return { success: false, error: result.error || 'Failed to create environment variable' };
      }

      // Revalidate paths that might display environment variables
      revalidatePath('/[locale]/[tenant]/environment-variables', 'page');

      console.log(
        `[@action:environmentVariablesAction:createEnvironmentVariable] Successfully created variable with key: ${variable.key}`,
      );

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('[@action:environmentVariablesAction:createEnvironmentVariable] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create environment variable',
      };
    }
  },
);

/**
 * Create multiple environment variables for a team in a single operation
 */
export const createEnvironmentVariablesBatch = cache(
  async (
    teamId: string,
    variables: Array<{
      key: string;
      value: string;
      description?: string;
      is_secret: boolean;
    }>,
  ) => {
    try {
      console.log(
        `[@action:environmentVariablesAction:createEnvironmentVariablesBatch] Creating ${variables.length} variables for team: ${teamId}`,
      );

      if (variables.length === 0) {
        return { success: true, data: [] };
      }

      // Verify user is authenticated
      const user = await getUser();
      if (!user) {
        console.error(
          '[@action:environmentVariablesAction:createEnvironmentVariablesBatch] User not authenticated',
        );
        return { success: false, error: 'User not authenticated' };
      }

      const cookieStore = await cookies();

      // Process and encrypt variables
      const processedVariables = variables.map((variable) => ({
        ...variable,
        value: variable.is_secret ? encryptValue(variable.value) : variable.value,
        team_id: teamId,
        created_by: user.id,
      }));

      // Debug log auth context
      console.log(
        `[@action:environmentVariablesAction:createEnvironmentVariablesBatch] User ID: ${user.id}, Team ID: ${teamId}, Variables count: ${variables.length}`,
      );

      // Call database layer to create environment variables in batch
      const result = await environmentVariablesDb.createEnvironmentVariablesBatch(
        processedVariables,
        cookieStore,
      );

      if (!result.success) {
        console.error(
          '[@action:environmentVariablesAction:createEnvironmentVariablesBatch] Error:',
          result.error,
        );
        return {
          success: false,
          error: result.error || 'Failed to create environment variables',
        };
      }

      // Revalidate paths that might display environment variables
      revalidatePath('/[locale]/[tenant]/environment-variables', 'page');

      console.log(
        `[@action:environmentVariablesAction:createEnvironmentVariablesBatch] Successfully created ${result.data.length} variables`,
      );

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error(
        '[@action:environmentVariablesAction:createEnvironmentVariablesBatch] Error:',
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create environment variables',
      };
    }
  },
);

/**
 * Update an existing environment variable
 */
export const updateEnvironmentVariable = cache(
  async (
    variableId: string,
    updates: {
      key?: string;
      value?: string;
      description?: string;
      is_secret?: boolean;
    },
  ) => {
    try {
      console.log(
        `[@action:environmentVariablesAction:updateEnvironmentVariable] Updating variable: ${variableId}`,
      );

      // Verify user is authenticated
      const user = await getUser();
      if (!user) {
        console.error(
          '[@action:environmentVariablesAction:updateEnvironmentVariable] User not authenticated',
        );
        return { success: false, error: 'User not authenticated' };
      }

      const cookieStore = await cookies();

      // Get the current variable to determine if we need to encrypt/decrypt
      const currentVar = await environmentVariablesDb.getEnvironmentVariableById(
        variableId,
        cookieStore,
      );

      if (!currentVar.success || !currentVar.data) {
        console.error(
          '[@action:environmentVariablesAction:updateEnvironmentVariable] Error fetching current variable:',
          currentVar.error,
        );
        return { success: false, error: 'Failed to fetch current variable state' };
      }

      // Process updates, handling encryption if needed
      const processedUpdates = { ...updates };

      // Only process value if it was provided in the updates
      if (updates.value !== undefined) {
        // Determine if the value needs encryption (either it was secret before, or is being made secret now)
        const shouldEncrypt =
          updates.is_secret !== undefined ? updates.is_secret : currentVar.data.is_secret;

        if (shouldEncrypt) {
          processedUpdates.value = encryptValue(updates.value);
        }
      }

      // Call database layer to update environment variable
      const result = await environmentVariablesDb.updateEnvironmentVariable(
        variableId,
        processedUpdates,
        cookieStore,
      );

      if (!result.success) {
        console.error(
          '[@action:environmentVariablesAction:updateEnvironmentVariable] Error:',
          result.error,
        );
        return { success: false, error: result.error || 'Failed to update environment variable' };
      }

      // Revalidate paths that might display environment variables
      revalidatePath('/[locale]/[tenant]/environment-variables', 'page');

      console.log(
        `[@action:environmentVariablesAction:updateEnvironmentVariable] Successfully updated variable: ${variableId}`,
      );

      return {
        success: true,
        data: result.data,
      };
    } catch (error) {
      console.error('[@action:environmentVariablesAction:updateEnvironmentVariable] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update environment variable',
      };
    }
  },
);

/**
 * Delete an environment variable
 */
export const deleteEnvironmentVariable = cache(async (variableId: string) => {
  try {
    console.log(
      `[@action:environmentVariablesAction:deleteEnvironmentVariable] Deleting variable: ${variableId}`,
    );

    // Verify user is authenticated
    const user = await getUser();
    if (!user) {
      console.error(
        '[@action:environmentVariablesAction:deleteEnvironmentVariable] User not authenticated',
      );
      return { success: false, error: 'User not authenticated' };
    }

    const cookieStore = await cookies();

    // Call database layer to delete environment variable
    const result = await environmentVariablesDb.deleteEnvironmentVariable(variableId, cookieStore);

    if (!result.success) {
      console.error(
        '[@action:environmentVariablesAction:deleteEnvironmentVariable] Error:',
        result.error,
      );
      return { success: false, error: result.error || 'Failed to delete environment variable' };
    }

    // Revalidate paths that might display environment variables
    revalidatePath('/[locale]/[tenant]/environment-variables', 'page');

    console.log(
      `[@action:environmentVariablesAction:deleteEnvironmentVariable] Successfully deleted variable: ${variableId}`,
    );

    return {
      success: true,
    };
  } catch (error) {
    console.error('[@action:environmentVariablesAction:deleteEnvironmentVariable] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete environment variable',
    };
  }
});

/**
 * Get environment variables for a specific job execution
 * This will fetch the variables based on team and filter/modify as needed
 */
export const getEnvironmentVariablesForJob = cache(async (jobId: string, teamId: string) => {
  try {
    console.log(
      `[@action:environmentVariablesAction:getEnvironmentVariablesForJob] Fetching for job: ${jobId}, team: ${teamId}`,
    );

    // Verify user is authenticated
    const user = await getUser();
    if (!user) {
      console.error(
        '[@action:environmentVariablesAction:getEnvironmentVariablesForJob] User not authenticated',
      );
      return { success: false, error: 'User not authenticated' };
    }

    const cookieStore = await cookies();

    // Get all environment variables for this team
    const result = await environmentVariablesDb.getEnvironmentVariablesByTeamId(
      teamId,
      cookieStore,
    );

    if (!result.success) {
      console.error(
        '[@action:environmentVariablesAction:getEnvironmentVariablesForJob] Error:',
        result.error,
      );
      return { success: false, error: result.error || 'Failed to fetch environment variables' };
    }

    // Process variables (decrypt secrets, format for job usage)
    const processedVariables =
      result.data?.reduce(
        (acc, variable) => {
          // Decrypt secret values
          const value = variable.is_secret ? decryptValue(variable.value) : variable.value;

          // Add to the accumulator as a key-value pair
          acc[variable.key] = value;

          return acc;
        },
        {} as Record<string, string>,
      ) || {};

    console.log(
      `[@action:environmentVariablesAction:getEnvironmentVariablesForJob] Successfully processed ${Object.keys(processedVariables).length} variables for job: ${jobId}`,
    );

    return {
      success: true,
      data: processedVariables,
    };
  } catch (error) {
    console.error(
      '[@action:environmentVariablesAction:getEnvironmentVariablesForJob] Error:',
      error,
    );
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch environment variables for job',
    };
  }
});
