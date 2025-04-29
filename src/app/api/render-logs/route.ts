import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[@api:render-logs] Starting to fetch logs from Render service');
    const renderApiEndpoint = process.env.RENDER_API_ENDPOINT;
    const renderApiKey = process.env.RENDER_API_KEY;

    if (!renderApiEndpoint || !renderApiKey) {
      console.error('[@api:render-logs] Render API endpoint or key is not defined');
      return NextResponse.json({
        success: false,
        error: 'Render API endpoint or key is not defined',
      });
    }

    // Calculate time range for the last 24 hours
    const endTime = new Date().toISOString();
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Construct the URL with query parameters
    const serviceId = 'srv-cvs2ol2dbo4c73ft9dqg';
    const url = `${renderApiEndpoint}/logs?serviceId=${serviceId}&startTime=${startTime}&endTime=${endTime}&limit=100`;

    console.log('[@api:render-logs] Fetching logs for service:', serviceId);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${renderApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[@api:render-logs] Successfully fetched logs for service:', serviceId);
      return NextResponse.json({ success: true, message: 'Logs fetched successfully', data });
    } else {
      const errorText = await response.text();
      console.error('[@api:render-logs] Failed to fetch logs:', response.status, errorText);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch logs from Render',
        status: response.status,
      });
    }
  } catch (error: any) {
    console.error('[@api:render-logs] Error fetching logs from Render service:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to fetch logs from Render service' });
  }
}
