import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  try {
    console.log(`[@api:upstash-logs] Starting to fetch queue_list data from Upstash Redis`);
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!upstashUrl || !upstashToken) {
      console.error(`[@api:upstash-logs] Upstash Redis URL or Token is not defined`);
      return NextResponse.json({
        success: false,
        error: 'Upstash Redis URL or Token is not defined',
      });
    }

    // Fetch data for queue_list key
    const response = await fetch(`${upstashUrl}/get/queue_list`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${upstashToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[@api:upstash-logs] Successfully fetched queue_list data from Upstash Redis`);
      return NextResponse.json({
        success: true,
        message: 'Queue list data fetched successfully',
        data: data.result,
      });
    } else {
      console.error(`[@api:upstash-logs] Failed to fetch queue_list data:`, response.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch queue_list data from Upstash Redis',
        status: response.status,
      });
    }
  } catch (error: any) {
    console.error(
      `[@api:upstash-logs] Error fetching queue_list data from Upstash Redis:`,
      error.message,
    );
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch queue_list data from Upstash Redis',
    });
  }
}
