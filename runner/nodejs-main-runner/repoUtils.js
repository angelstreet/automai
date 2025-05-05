const axios = require('axios');

async function pingRepository(repoUrl) {
  try {
    console.log(`[pingRepository] Checking availability of repository: ${repoUrl}`);
    // Attempt a GET request to the repository URL for universal compatibility
    const response = await axios.get(repoUrl, { timeout: 5000 });

    // Accept a range of status codes that indicate the server is reachable
    if (response.status >= 200 && response.status < 500) {
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
