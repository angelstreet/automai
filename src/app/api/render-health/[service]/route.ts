import https from 'https';

import { NextResponse } from 'next/server';

// Status constants
const STATUS = {
  AWAKE: 'awake',
  WAKING_UP: 'waking_up',
  ERROR: 'error',
};

export async function GET(_request: Request, { params }: { params: { service: string } }) {
  try {
    const service = (await params).service;
    console.log(`[@api:render-health] Checking health for Render ${service} service`);

    let renderUrl;
    switch (service) {
      case 'main-prod':
        renderUrl = process.env.NODEJS_MAIN_RUNNER_PROD_URL;
        break;
      case 'python-prod':
        renderUrl = process.env.PYTHON_DOCKER_RUNNER_PROD_URL;
        break;
      case 'main-preprod':
        renderUrl = process.env.NODEJS_MAIN_RUNNER_PREPROD_URL;
        break;
      case 'python-preprod':
        renderUrl = process.env.PYTHON_DOCKER_RUNNER_PREPROD_URL;
        break;
      case 'playwright-prod':
        renderUrl = process.env.PYTHON_PLAYWRIGHT_RUNNER_PROD_URL;
        break;
      case 'playwright-preprod':
        renderUrl = process.env.PYTHON_PLAYWRIGHT_RUNNER_PREPROD_URL;
        break;
      default:
        console.error('[@api:render-health] Invalid service specified:', service);
        return NextResponse.json({
          success: false,
          status: STATUS.ERROR,
          error: 'Invalid service specified',
        });
    }

    if (!renderUrl) {
      console.error(`[@api:render-health] Render ${service} service URL is not defined`);
      return NextResponse.json({
        success: false,
        status: STATUS.ERROR,
        error: `Render ${service} service URL is not defined`,
      });
    }

    console.log(`[@api:render-health] Render service url ${renderUrl}`);

    // First check if service is already active using /healthz endpoint
    const healthEndpoint = `${renderUrl}/healthz`;
    console.log(`[@api:render-health] Checking health endpoint: ${healthEndpoint}`);

    const healthResponse = await makeHttpsRequest(healthEndpoint);

    // If service is already active (200 response)
    if (healthResponse.statusCode === 200) {
      console.log(`[@api:render-health] Render ${service} service is already awake`);
      return NextResponse.json({
        success: true,
        status: STATUS.AWAKE,
        message: `Render ${service} service is awake`,
      });
    }

    // If service is not active, try to wake it up
    console.log(
      `[@api:render-health] Render ${service} service is not active, attempting to wake up`,
    );

    // Hit the root URL to wake up the service
    await makeHttpsRequest(renderUrl);

    // Try to verify if the service woke up (3 attempts with 50s intervals)
    const maxRetries = 3;
    const retryDelayMs = 50000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(
        `[@api:render-health] Waiting for Render ${service} to wake up, attempt ${attempt}/${maxRetries}`,
      );

      // Wait for the retry delay
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));

      // Check health again
      const retryHealthResponse = await makeHttpsRequest(healthEndpoint);

      if (retryHealthResponse.statusCode === 200) {
        console.log(
          `[@api:render-health] Render ${service} service woke up successfully on attempt ${attempt}`,
        );
        return NextResponse.json({
          success: true,
          status: STATUS.AWAKE,
          message: `Render ${service} service woke up successfully`,
        });
      }
    }

    // If still not awake after max retries
    console.log(
      `[@api:render-health] Render ${service} service failed to wake up after ${maxRetries} attempts`,
    );
    return NextResponse.json({
      success: false,
      status: STATUS.WAKING_UP,
      message: `Render ${service} service is still waking up after ${maxRetries} attempts`,
    });
  } catch (error: any) {
    console.error(`[@api:render-health] Error checking health for Render service:`, error.message);
    return NextResponse.json({
      success: false,
      status: STATUS.ERROR,
      error: 'Failed to check health for Render service',
    });
  }
}

function makeHttpsRequest(url: string): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
          Connection: 'keep-alive',
        },
      },
      (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode || 0,
            data,
          });
        });
      },
    );

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Request timed out after 60 seconds'));
    });

    req.end();
  });
}
