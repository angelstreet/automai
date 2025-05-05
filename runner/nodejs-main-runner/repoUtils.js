const axios = require('axios');

async function pingRepository(repoUrl) {
  try {
    console.log(`[pingRepository] Checking availability of repository: ${repoUrl}`);
    const response = await axios.head(repoUrl, { timeout: 5000 });

    if (response.status === 200 || response.status === 401 || response.status === 403) {
      console.log(
        `[pingRepository] Repository ${repoUrl} is accessible (status: ${response.status})`,
      );
      return true;
    } else {
      console.error(
        `[pingRepository] Failed to check repository ${repoUrl}: ${response.status} ${response.statusText}`,
      );
      return false;
    }
  } catch (error) {
    console.error(`[pingRepository] Error checking repository ${repoUrl}: ${error.message}`);
    return false;
  }
}

module.exports = { pingRepository };
