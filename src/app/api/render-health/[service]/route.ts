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

    try {
      const healthResponse = await makeFetchRequest(healthEndpoint);

      // If service is already active (200 response)
      if (healthResponse.status === 200) {
        return NextResponse.json({
          success: true,
          status: STATUS.AWAKE,
          message: `Render ${service} service is awake`,
        });
      }

      // Hit the root URL to wake up the service asynchronously
      const wakeupPromise = makeFetchRequest(renderUrl).catch((error) => {
        console.warn(`[@api:render-health] Wake-up request failed:`, error.message);
        // We don't fail here as the service might still wake up
      });

      // Try to verify if the service woke up (10 attempts with 10s intervals)
      const maxRetries = 10;
      const retryDelayMs = 10000;

      // Create an array of retry attempts
      const retryAttempts = Array.from({ length: maxRetries }, (_, index) => index + 1);

      // Run health checks in parallel with proper delays
      const results = await Promise.all(
        retryAttempts.map(async (attempt) => {
          // Wait for the retry delay
          await new Promise((resolve) => setTimeout(resolve, attempt * retryDelayMs));

          try {
            const retryHealthResponse = await makeFetchRequest(healthEndpoint);
            if (retryHealthResponse.status === 200) {
              console.log(
                `[@api:render-health] Render ${service} service woke up successfully on attempt ${attempt}`,
              );
              return { success: true, attempt };
            }
          } catch (error: any) {
            console.warn(
              `[@api:render-health] Attempt ${attempt} failed for ${healthEndpoint}:`,
              error.message,
            );
          }
          return { success: false, attempt };
        }),
      );

      // Check if any attempt was successful
      const successfulAttempt = results.find((result) => result.success);

      if (successfulAttempt) {
        return NextResponse.json({
          success: true,
          status: STATUS.AWAKE,
          message: `Render ${service} service woke up successfully`,
        });
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
      console.error(`[@api:render-health] Error during health check:`, error.message);
      return NextResponse.json({
        success: false,
        status: STATUS.ERROR,
        error: `Failed to check health: ${error.message}`,
      });
    }
  } catch (error: any) {
    console.error(`[@api:render-health] Error checking health for Render service:`, error.message);
    return NextResponse.json({
      success: false,
      status: STATUS.ERROR,
      error: 'Failed to check health for Render service',
    });
  }
}

async function makeFetchRequest(url: string): Promise<{ status: number; data: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000); // 120s timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        Connection: 'keep-alive',
      },
    });
    clearTimeout(timeoutId);

    const data = await response.text();
    return {
      status: response.status,
      data,
    };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 120 seconds');
    }
    throw error;
  }
}
