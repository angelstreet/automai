const axios = require('axios');

async function pingRepository(repoUrl) {
  try {
    console.log(`[pingRepository] Checking availability of repository: ${repoUrl}`);
    const response = await axios.post(
      process.env.REPOSITORY_PING_URL,
      { repo_url: repoUrl },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.REPOSITORY_PING_TOKEN}`,
        },
      },
    );

    if (response.status !== 200) {
      console.error(
        `[pingRepository] Failed to check repository ${repoUrl}: ${response.status} ${response.statusText}`,
      );
      return false;
    }
    console.log(`[pingRepository] Repository ${repoUrl} is accessible`);
    return true;
  } catch (error) {
    console.error(`[pingRepository] Error checking repository ${repoUrl}: ${error.message}`);
    return false;
  }
}

module.exports = { pingRepository };
