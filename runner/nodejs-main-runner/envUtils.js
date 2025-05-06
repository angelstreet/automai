const { decrypt } = require('./utils');

async function fetchAndDecryptEnvVars(supabase, team_id) {
  let encryptedEnvVars = {};
  let decryptedEnvVars = {};
  if (team_id) {
    // Fetch team-specific environment variables
    const { data: teamEnvVarsData, error: teamEnvVarsError } = await supabase
      .from('environment_variables')
      .select('key, value')
      .eq('team_id', team_id);

    if (teamEnvVarsError) {
      console.error(
        `[fetchAndDecryptEnvVars] Failed to fetch team-specific environment variables for team ${team_id}: ${teamEnvVarsError.message}`,
      );
    }

    // Fetch tenant_id for the team to get shared variables
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('tenant_id')
      .eq('id', team_id)
      .single();

    let sharedEnvVarsData = [];
    if (teamError) {
      console.error(
        `[fetchAndDecryptEnvVars] Failed to fetch tenant for team ${team_id}: ${teamError.message}`,
      );
    } else if (teamData && teamData.tenant_id) {
      // Fetch shared variables for the tenant
      const { data: sharedData, error: sharedError } = await supabase
        .from('shared_environment_variables')
        .select('key, value')
        .eq('tenant_id', teamData.tenant_id);

      if (sharedError) {
        console.error(
          `[fetchAndDecryptEnvVars] Failed to fetch shared environment variables for tenant ${teamData.tenant_id}: ${sharedError.message}`,
        );
      } else if (sharedData) {
        sharedEnvVarsData = sharedData;
      }
    }

    // Combine shared and team-specific variables (team-specific take precedence)
    const combinedEnvVars = {
      ...(sharedEnvVarsData || []).reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {}),
      ...(teamEnvVarsData || []).reduce((acc, { key, value }) => {
        acc[key] = value;
        return acc;
      }, {}),
    };

    encryptedEnvVars = combinedEnvVars;

    // Decrypt environment variables
    decryptedEnvVars = Object.fromEntries(
      Object.entries(encryptedEnvVars).map(([key, value]) => {
        if (value && typeof value === 'string' && value.includes(':')) {
          try {
            const decryptedValue = decrypt(value, process.env.ENCRYPTION_KEY);
            console.log(`[fetchAndDecryptEnvVars] Decrypted environment variable: ${key}`);
            return [key, decryptedValue];
          } catch (err) {
            console.error(
              `[fetchAndDecryptEnvVars] Failed to decrypt environment variable ${key}: ${err.message}`,
            );
            return [key, value];
          }
        }
        return [key, value];
      }),
    );
    console.log(
      `[fetchAndDecryptEnvVars] Fetched and processed ${Object.keys(encryptedEnvVars).length} environment variables (team-specific: ${teamEnvVarsData?.length || 0}, shared: ${sharedEnvVarsData?.length || 0}) for team ${team_id}`,
    );
  } else {
    console.log(
      `[fetchAndDecryptEnvVars] Skipping environment variables fetch: team_id=${team_id}`,
    );
  }
  return decryptedEnvVars;
}

module.exports = { fetchAndDecryptEnvVars };
