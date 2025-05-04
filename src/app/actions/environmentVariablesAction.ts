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

    // Call database layer to get all environment variables (team-specific and shared)
    const result = await environmentVariablesDb.getAllEnvironmentVariables(teamId, cookieStore);

    if (!result.success) {
      console.error(
        '[@action:environmentVariablesAction:getTeamEnvironmentVariables] Error:',
        result.error,
      );
      return { success: false, error: result.error || 'Failed to fetch environment variables' };
    }

    // Decrypt all values before returning
    const decryptedVariables =
      result.data?.map((variable) => ({
        ...variable,
        value: decryptValue(variable.value),
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
      isShared?: boolean;
    },
  ) => {
    try {
      console.log(
        `[@action:environmentVariablesAction:createEnvironmentVariable] Creating variable for team: ${teamId}, shared: ${variable.isShared || false}`,
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

      // Always encrypt the value before storing
      const processedVariable = {
        ...variable,
        value: encryptValue(variable.value),
        team_id: teamId,
        created_by: user.id,
      };

      // Debug log the auth context
      console.log(
        `[@action:environmentVariablesAction:createEnvironmentVariable] User ID: ${user.id}, Team ID: ${teamId}`,
      );

      let result;
      if (variable.isShared) {
        // Fetch tenant ID for shared variable
        const tenantResult = await environmentVariablesDb.getTenantIdByTeamId(teamId, cookieStore);
        if (!tenantResult.success) {
          console.error(
            '[@action:environmentVariablesAction:createEnvironmentVariable] Error fetching tenant ID:',
            tenantResult.error,
          );
          return { success: false, error: tenantResult.error || 'Failed to fetch tenant ID' };
        }

        const tenantId = tenantResult.data;
        const sharedVariable = {
          key: variable.key,
          value: encryptValue(variable.value),
          description: variable.description,
          tenant_id: tenantId,
          created_by: user.id,
        };

        result = await environmentVariablesDb.createSharedEnvironmentVariable(
          sharedVariable,
          cookieStore,
        );
      } else {
        result = await environmentVariablesDb.createEnvironmentVariable(
          processedVariable,
          cookieStore,
        );
      }

      if (!result.success) {
        console.error(
          '[@action:environmentVariablesAction:createEnvironmentVariable] Error:',
          result.error,
        );
        return { success: false, error: result.error || 'Failed to create environment variable' };
      }

      revalidatePath('/[locale]/[tenant]/environment-variables');

      console.log(
        `[@action:environmentVariablesAction:createEnvironmentVariable] Successfully created variable with key: ${variable.key}`,
      );

      // Decrypt the value before returning the variable
      const updatedVariable = result.data
        ? {
            ...result.data,
            value: decryptValue(result.data.value),
          }
        : null;

      return {
        success: true,
        data: updatedVariable,
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
      isShared?: boolean;
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

      // Separate variables into team-specific and shared
      const teamVariables = variables
        .filter((v) => !v.isShared)
        .map((variable) => ({
          ...variable,
          value: encryptValue(variable.value),
          team_id: teamId,
          created_by: user.id,
        }));

      const sharedVariables = variables.filter((v) => v.isShared);

      let sharedResult = { success: true, data: [] as EnvironmentVariable[] };
      if (sharedVariables.length > 0) {
        // Fetch tenant ID for shared variables
        const tenantResult = await environmentVariablesDb.getTenantIdByTeamId(teamId, cookieStore);
        if (!tenantResult.success) {
          console.error(
            '[@action:environmentVariablesAction:createEnvironmentVariablesBatch] Error fetching tenant ID:',
            tenantResult.error,
          );
          return { success: false, error: tenantResult.error || 'Failed to fetch tenant ID' };
        }

        const tenantId = tenantResult.data;
        const processedSharedVariables = sharedVariables.map((variable) => ({
          key: variable.key,
          value: encryptValue(variable.value),
          description: variable.description,
          tenant_id: tenantId,
          created_by: user.id,
        }));

        sharedResult = await environmentVariablesDb.createSharedEnvironmentVariablesBatch(
          processedSharedVariables,
          cookieStore,
        );
        if (!sharedResult.success) {
          console.error(
            '[@action:environmentVariablesAction:createEnvironmentVariablesBatch] Error creating shared variables:',
            sharedResult.error,
          );
          return {
            success: false,
            error: sharedResult.error || 'Failed to create shared environment variables',
          };
        }
      }

      let teamResult = { success: true, data: [] as EnvironmentVariable[] };
      if (teamVariables.length > 0) {
        teamResult = await environmentVariablesDb.createEnvironmentVariablesBatch(
          teamVariables,
          cookieStore,
        );
        if (!teamResult.success) {
          console.error(
            '[@action:environmentVariablesAction:createEnvironmentVariablesBatch] Error creating team variables:',
            teamResult.error,
          );
          return {
            success: false,
            error: teamResult.error || 'Failed to create team environment variables',
          };
        }
      }

      // Revalidate paths that might display environment variables
      revalidatePath('/[locale]/[tenant]/environment-variables', 'page');

      // Combine results and decrypt values before returning
      const combinedData = [...teamResult.data, ...sharedResult.data];
      const decryptedVariables = combinedData
        ? combinedData.map((variable) => ({
            ...variable,
            value: decryptValue(variable.value),
          }))
        : [];

      console.log(
        `[@action:environmentVariablesAction:createEnvironmentVariablesBatch] Successfully created ${combinedData.length} variables (team: ${teamResult.data.length}, shared: ${sharedResult.data.length})`,
      );

      return {
        success: true,
        data: decryptedVariables,
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
    id: string,
    updates: {
      key?: string;
      value?: string;
      description?: string;
      isShared?: boolean;
    },
  ) => {
    try {
      console.log(
        `[@action:environmentVariablesAction:updateEnvironmentVariable] Updating variable: ${id}`,
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

      // Encrypt value if provided
      const processedUpdates = {
        ...updates,
        value: updates.value ? encryptValue(updates.value) : undefined,
      };

      // Call database layer to update the variable
      const result = await environmentVariablesDb.updateEnvironmentVariable(
        id,
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
        `[@action:environmentVariablesAction:updateEnvironmentVariable] Successfully updated variable: ${id}`,
      );

      // Decrypt the value before returning the variable
      const updatedVariable = result.data
        ? {
            ...result.data,
            value: decryptValue(result.data.value),
          }
        : null;

      return {
        success: true,
        data: updatedVariable,
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

    // Get all environment variables for this team (including shared)
    const result = await environmentVariablesDb.getAllEnvironmentVariables(teamId, cookieStore);

    if (!result.success) {
      console.error(
        '[@action:environmentVariablesAction:getEnvironmentVariablesForJob] Error:',
        result.error,
      );
      return { success: false, error: result.error || 'Failed to fetch environment variables' };
    }

    // Process variables (decrypt all values, format for job usage)
    const processedVariables =
      result.data?.reduce(
        (acc, variable) => {
          // Decrypt values
          const value = decryptValue(variable.value);

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
