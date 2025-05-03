import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  try {
    console.log(`[@api:upstash-health] Sending PING request to Upstash Redis`);
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!upstashUrl || !upstashToken) {
      console.error(`[@api:upstash-health] Upstash Redis URL or Token is not defined`);
      return NextResponse.json({
        success: false,
        error: 'Upstash Redis URL or Token is not defined',
      });
    }

    const response = await fetch(`${upstashUrl}/ping`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.result === 'PONG') {
        console.log(`[@api:upstash-health] Upstash Redis responded with PONG`);
        return NextResponse.json({
          success: true,
          message: 'Upstash Redis is responsive',
        });
      } else {
        console.log(`[@api:upstash-health] Upstash Redis did not respond with PONG`);
        return NextResponse.json({
          success: false,
          message: 'Upstash Redis did not respond as expected',
        });
      }
    } else {
      console.log(
        `[@api:upstash-health] Upstash Redis health check failed with status: ${response.status}`,
      );
      return NextResponse.json({
        success: false,
        message: 'Upstash Redis health check failed',
      });
    }
  } catch (error: any) {
    console.error(`[@api:upstash-health] Error checking Upstash Redis health:`, error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check Upstash Redis health',
      },
      { status: 503 },
    );
  }
}
