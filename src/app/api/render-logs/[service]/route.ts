import { NextResponse } from 'next/server';

export async function GET(_request: Request, { params }: { params: { service: string } }) {
  try {
    const service = (await params).service;
    console.log(`[@api:render-logs] Starting to fetch logs from Render ${service} service`);
    const renderApiEndpoint = process.env.RENDER_API_ENDPOINT;
    const renderApiKey = process.env.RENDER_API_KEY;
    const renderApiOwner = process.env.RENDER_API_OWNER;

    let serviceId;
    switch (service) {
      case 'main-prod':
        serviceId = process.env.NODEJS_MAIN_RUNNER_PROD_SERVICE_ID;
        break;
      case 'python-prod':
        serviceId = process.env.PYTHON_DOCKER_RUNNER_PROD_SERVICE_ID;
        break;
      case 'main-preprod':
        serviceId = process.env.NODEJS_MAIN_RUNNER_PREPROD_SERVICE_ID;
        break;
      case 'python-preprod':
        serviceId = process.env.PYTHON_DOCKER_RUNNER_PREPROD_SERVICE_ID;
        break;
      case 'playwright-prod':
        serviceId = process.env.PYTHON_PLAYWRIGHT_RUNNER_PROD_SERVICE_ID;
        break;
      case 'playwright-preprod':
        serviceId = process.env.PYTHON_PLAYWRIGHT_RUNNER_PREPROD_SERVICE_ID;
        break;
      default:
        console.error('[@api:render-logs] Invalid service specified:', service);
        return NextResponse.json({
          success: false,
          error: 'Invalid service specified',
        });
    }

    if (!renderApiEndpoint || !renderApiKey || !renderApiOwner || !serviceId) {
      console.error(
        `[@api:render-logs] Required configuration missing for ${service} service. Endpoint defined:`,
        !!renderApiEndpoint,
        ', Key defined:',
        !!renderApiKey,
        ', Owner defined:',
        !!renderApiOwner,
        ', ServiceId defined:',
        !!serviceId,
      );
      return NextResponse.json({
        success: false,
        error: 'Required configuration is missing',
      });
    }

    // Ensure no trailing slash in the endpoint to prevent double slashes
    const cleanedEndpoint = renderApiEndpoint.replace(/\/+$/, '');

    // Replace underscore with hyphen in serviceId to match Render API format
    const formattedServiceId = serviceId.replace('srv_', 'srv-');

    // Construct the URL with query parameters
    const url = `${cleanedEndpoint}/logs?ownerId=${renderApiOwner}&direction=backward&resource=${formattedServiceId}&limit=100`;

    console.log(
      `[@api:render-logs] Fetching logs for ${service} service:`,
      serviceId,
      'with formatted ID:',
      formattedServiceId,
      'with URL:',
      url,
    );
    console.log(
      `[@api:render-logs] Request headers:`,
      JSON.stringify(
        {
          Authorization: `Bearer ${renderApiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        null,
        2,
      ),
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${renderApiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(
        `[@api:render-logs] Successfully fetched logs for ${service} service:`,
        serviceId,
      );
      return NextResponse.json({ success: true, message: 'Logs fetched successfully', data });
    } else {
      const errorText = await response.text();
      console.error(
        `[@api:render-logs] Failed to fetch ${service} logs:`,
        response.status,
        errorText,
      );
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch logs from Render',
        status: response.status,
      });
    }
  } catch (error: any) {
    console.error(`[@api:render-logs] Error fetching logs from Render service:`, error.message);
    return NextResponse.json({ success: false, error: 'Failed to fetch logs from Render service' });
  }
}
