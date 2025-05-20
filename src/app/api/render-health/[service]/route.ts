import https from 'https';

import { NextResponse } from 'next/server';

export async function GET(_request: Request, { params }: { params: { service: string } }) {
  try {
    const service = (await params).service;
    console.log(`[@api:render-health] Sending request to wake up Render ${service} service`);

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
          error: 'Invalid service specified',
        });
    }

    if (!renderUrl) {
      console.error(`[@api:render-health] Render ${service} service URL is not defined`);
      return NextResponse.json({
        success: false,
        error: `Render ${service} service URL is not defined`,
      });
    }

    // Make HTTP request using native https module instead of fetch
    const response = await makeHttpsRequest(renderUrl);
    console.log(
      `[@api:render-health] Render ${service} service response status:`,
      response.statusCode,
    );

    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log(`[@api:render-health] Render ${service} service is awake`);
      return NextResponse.json({
        success: true,
        message: `Render ${service} service is awake`,
      });
    } else {
      console.log(`[@api:render-health] Render ${service} service is waking up`);
      return NextResponse.json({
        success: true,
        message: `Render ${service} service is waking up, please wait`,
      });
    }
  } catch (error: any) {
    console.error(`[@api:render-health] Error waking up Render service:`, error.message);
    return NextResponse.json({
      success: false,
      error: 'Failed to wake up Render service',
    });
  }
}

// Helper function to make HTTPS request
function makeHttpsRequest(url: string): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    // Remove protocol from URL if present
    const urlWithoutProtocol = url.replace(/^https?:\/\//, '');

    // Split the URL into hostname and path
    const [hostname, ...pathParts] = urlWithoutProtocol.split('/');
    const path = pathParts.length > 0 ? `/${pathParts.join('/')}` : '/';

    const options = {
      hostname,
      path,
      method: 'GET',
      headers: {
        Accept: '*/*',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}
