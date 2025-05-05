const fetch = require('node-fetch');

async function pingRepository(jobId, status, reportUrl = null, loggerPrefix = 'runner') {
  try {
    console.log(
      `[@${loggerPrefix}:pingRepository] Pinging repository for job ${jobId} with status ${status}`,
    );
    const payload = { job_id: jobId, status };
    if (reportUrl) {
      payload.report_url = reportUrl;
    }
    console.log(
      `[@${loggerPrefix}:pingRepository] Sending payload to repository for job ${jobId}:`,
      JSON.stringify(payload, null, 2),
    );
    const response = await fetch(process.env.REPOSITORY_PING_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.REPOSITORY_PING_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error(
        `[@${loggerPrefix}:pingRepository] Failed to ping repository for job ${jobId}: ${response.status} ${response.statusText}`,
      );
      return false;
    }
    console.log(
      `[@${loggerPrefix}:pingRepository] Successfully pinged repository for job ${jobId}`,
    );
    return true;
  } catch (error) {
    console.error(
      `[@${loggerPrefix}:pingRepository] Error pinging repository for job ${jobId}: ${error.message}`,
    );
    return false;
  }
}

module.exports = { pingRepository };
