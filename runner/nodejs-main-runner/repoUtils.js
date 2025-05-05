const fetch = require('node-fetch');

async function pingRepository(repoUrl) {
  try {
    console.log(`[pingRepository] Checking availability of repository: ${repoUrl}`);
    const response = await fetch(process.env.REPOSITORY_PING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.REPOSITORY_PING_TOKEN}`,
      },
      body: JSON.stringify({ repo_url: repoUrl }),
    });

    if (!response.ok) {
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
