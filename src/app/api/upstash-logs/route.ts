import { NextResponse } from 'next/server';

export async function GET(_request: Request) {
  try {
    console.log(`[@api:upstash-logs] Starting to fetch queue data from Upstash Redis`);
    const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
    const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!upstashUrl || !upstashToken) {
      console.error(`[@api:upstash-logs] Upstash Redis URL or Token is not defined`);
      return NextResponse.json({
        success: false,
        error: 'Upstash Redis URL or Token is not defined',
      });
    }

    const queues = ['queue_list', 'queue_list_prod', 'queue_list_preprod'];
    const results: { [key: string]: any } = {};
    const errors: { [key: string]: string } = {};

    for (const queue of queues) {
      try {
        // Fetch data for each queue key
        const response = await fetch(`${upstashUrl}/get/${queue}`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${upstashToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[@api:upstash-logs] Successfully fetched ${queue} data from Upstash Redis`);
          results[queue] = data.result;
        } else {
          console.error(`[@api:upstash-logs] Failed to fetch ${queue} data:`, response.status);
          errors[queue] = `Failed to fetch ${queue} data: ${response.status}`;
          results[queue] = null;
        }
      } catch (error: any) {
        console.error(
          `[@api:upstash-logs] Error fetching ${queue} data from Upstash Redis:`,
          error.message,
        );
        errors[queue] = `Error fetching ${queue} data: ${error.message}`;
        results[queue] = null;
      }
    }

    console.log(`[@api:upstash-logs] Completed fetching queue data from Upstash Redis`);
    return NextResponse.json({
      success: true,
      message: 'Queue data fetched',
      data: results,
      errors: errors,
    });
  } catch (error: any) {
    console.error(
      `[@api:upstash-logs] Unexpected error fetching queue data from Upstash Redis:`,
      error.message,
    );
    return NextResponse.json({
      success: false,
      error: 'Unexpected error fetching queue data',
    });
  }
}
