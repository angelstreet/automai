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

    const response = await fetch(`${renderUrl}/health`, { method: 'GET' });
    if (response.ok) {
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
