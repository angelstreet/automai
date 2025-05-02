import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[@api:render-logs] Starting to fetch logs from Render service');
    const renderApiEndpoint = process.env.RENDER_API_ENDPOINT;
    const renderApiKey = process.env.RENDER_API_KEY;
    const renderApiOwner = process.env.RENDER_API_OWNER;
    const serviceId = process.env.RENDER_MAIN_SERVICE_ID;

    if (!renderApiEndpoint || !renderApiKey || !renderApiOwner) {
      console.error(
        '[@api:render-logs] Render API endpoint, key, or owner is not defined. Endpoint defined: ',
        !!renderApiEndpoint,
        ', Key defined: ',
        !!renderApiKey,
        ', Owner defined: ',
        !!renderApiOwner,
      );
      return NextResponse.json({
        success: false,
        error: 'Render API endpoint, key, or owner is not defined',
      });
    }

    // Ensure no trailing slash in the endpoint to prevent double slashes
    const cleanedEndpoint = renderApiEndpoint.replace(/\/+$/, '');

    // Construct the URL with query parameters

    const url = `${cleanedEndpoint}/logs?ownerId=${renderApiOwner}&direction=backward&resource=${serviceId}&limit=100`;

    console.log('[@api:render-logs] Fetching logs for service:', serviceId, 'with URL:', url);
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
