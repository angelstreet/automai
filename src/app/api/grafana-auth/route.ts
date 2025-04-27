import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // Get Grafana URL from environment variable
    const grafanaUrl = process.env.GRAFANA_URL || process.env.NEXT_PUBLIC_GRAFANA_URL;

    if (!grafanaUrl) {
      console.error('[@api:grafana-auth] Grafana URL not configured');
      return NextResponse.json({ error: 'Grafana URL not configured' }, { status: 500 });
    }

    console.log(`[@api:grafana-auth] Attempting to authenticate with Grafana at ${grafanaUrl}`);

    // Call Grafana's login API
    const loginResponse = await fetch(`${grafanaUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user: username, password }),
      cache: 'no-store',
    });

    // Grafana might return 200 even for failed login attempts, so we need to check for cookies
    const cookies = loginResponse.headers.get('set-cookie');
    if (!loginResponse.ok || !cookies) {
      console.error(
        `[@api:grafana-auth] Authentication failed with status ${loginResponse.status}`,
      );
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    console.log('[@api:grafana-auth] Authentication successful');

    // Create a successful response
    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
    });

    // Forward the authentication cookies to the client
    // Parse and forward each cookie individually
    const cookiesArray = cookies.split(',');
    for (const cookie of cookiesArray) {
      const trimmedCookie = cookie.trim();
      if (trimmedCookie) {
        response.headers.append('Set-Cookie', trimmedCookie);
      }
    }

    return response;
  } catch (error) {
    console.error('[@api:grafana-auth] Error during authentication:', error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get Grafana URL from environment variable
    const grafanaUrl = process.env.GRAFANA_URL || process.env.NEXT_PUBLIC_GRAFANA_URL;

    if (!grafanaUrl) {
      return NextResponse.json(
        { authenticated: false, error: 'Grafana URL not configured' },
        { status: 500 },
      );
    }

    // Extract cookies from the incoming request
    const cookies = request.headers.get('cookie') || '';

    // Verify authentication by making a request to Grafana API
    const verifyResponse = await fetch(`${grafanaUrl}/api/user`, {
      headers: {
        Cookie: cookies,
      },
      cache: 'no-store',
    });

    if (verifyResponse.ok) {
      return NextResponse.json({ authenticated: true });
    } else {
      return NextResponse.json({ authenticated: false });
    }
  } catch (error) {
    console.error('[@api:grafana-auth] Error checking authentication:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Failed to verify authentication' },
      { status: 500 },
    );
  }
}
