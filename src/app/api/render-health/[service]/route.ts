import { NextResponse } from 'next/server';

// Status constants
const STATUS = {
  AWAKE: 'awake',
  WAKING_UP: 'waking_up',
  ERROR: 'error',
};

// In-memory cache for service status
const serviceStatusCache = new Map<string, { status: string; lastChecked: number }>();

// Configuration
const MAX_RETRIES = 5; // Reduced retries
const RETRY_DELAY_MS = 5000; // 5s delay
const FETCH_TIMEOUT_MS = 10000; // 10s timeout
const CACHE_TTL_MS = 300000; // 5 minutes

export async function GET(_request: Request, { params }: { params: { service: string } }) {
  try {
    const service = (await params).service;
    let renderUrl;

    // Map service to URL
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
    const healthEndpoint = `${renderUrl}/healthz`;
    console.log(`[@api:render-health] Checking health endpoint: ${healthEndpoint}`);

    // Check cache first
    const cachedStatus = serviceStatusCache.get(service);
    const now = Date.now();
    if (cachedStatus && now - cachedStatus.lastChecked < CACHE_TTL_MS) {
      console.log(
        `[@api:render-health] Returning cached status for ${service}: ${cachedStatus.status}`,
      );
      return NextResponse.json({
        success: cachedStatus.status === STATUS.AWAKE,
        status: cachedStatus.status,
        message: `Render ${service} service status from cache`,
      });
    }

    // Check if service is already awake
    try {
      const healthResponse = await makeFetchRequest(healthEndpoint);
      if (healthResponse.status === 200) {
        serviceStatusCache.set(service, { status: STATUS.AWAKE, lastChecked: now });
        return NextResponse.json({
          success: true,
          status: STATUS.AWAKE,
          message: `Render ${service} service is awake`,
        });
      }
    } catch (error: any) {
      console.warn(`[@api:render-health] Initial health check failed: ${error.message}`);
    }

    // Service is not awake; initiate wake-up asynchronously
    serviceStatusCache.set(service, { status: STATUS.WAKING_UP, lastChecked: now });

    // Start wake-up process in the background
    wakeUpService(service, renderUrl, healthEndpoint).catch((error) => {
      console.error(
        `[@api:render-health] Background wake-up failed for ${service}:`,
        error.message,
      );
    });

    // Respond immediately
    return NextResponse.json({
      success: false,
      status: STATUS.WAKING_UP,
      message: `Render ${service} service is waking up`,
    });
  } catch (error: any) {
    console.error(`[@api:render-health] Error checking health for ${service}:`, error.message);
    serviceStatusCache.set(service, { status: STATUS.ERROR, lastChecked: Date.now() });
    return NextResponse.json({
      success: false,
      status: STATUS.ERROR,
      error: 'Failed to check health for Render service',
    });
  }
}

async function wakeUpService(service: string, renderUrl: string, healthEndpoint: string) {
  // Trigger wake-up request
  makeFetchRequest(renderUrl).catch((error) => {
    console.warn(`[@api:render-health] Wake-up request failed for ${service}:`, error.message);
  });

  // Sequential retries
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      const retryHealthResponse = await makeFetchRequest(healthEndpoint);
      if (retryHealthResponse.status === 200) {
        console.log(
          `[@api:render-health] Render ${service} service woke up successfully on attempt ${attempt}`,
        );
        serviceStatusCache.set(service, { status: STATUS.AWAKE, lastChecked: Date.now() });
        return;
      }
    } catch (error: any) {
      console.warn(`[@api:render-health] Attempt ${attempt} failed for ${service}:`, error.message);
    }
  }

  // If retries fail
  console.log(
    `[@api:render-health] Render ${service} service failed to wake up after ${MAX_RETRIES} attempts`,
  );
  serviceStatusCache.set(service, { status: STATUS.WAKING_UP, lastChecked: Date.now() });
}

async function makeFetchRequest(url: string): Promise<{ status: number; data: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

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
      throw new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000} seconds`);
    }
    throw error;
  }
}
