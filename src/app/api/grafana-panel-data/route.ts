import { NextRequest, NextResponse } from 'next/server';

// This API route fetches the actual data for panels from Grafana
// It uses the Grafana Query API to execute the queries defined in panel targets
export async function POST(request: NextRequest) {
  const apiKey = process.env.GRAFANA_API_TOKEN;
  const baseUrl = process.env.GRAFANA_URL;

  if (!apiKey || !baseUrl) {
    return NextResponse.json({ error: 'Grafana API token or URL not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { dashboardUid, panelId, queries, timeRange } = body;

    if (!dashboardUid || !panelId || !queries) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Log the request for debugging
    console.log(
      '[@api:grafana-panel-data] Fetching data for dashboard:',
      dashboardUid,
      'panel:',
      panelId,
    );

    // Construct the query request to Grafana's data API
    // Grafana's query endpoint is typically /api/ds/query
    const url = `${baseUrl}/api/ds/query`;

    // Format queries for Grafana API
    // Ensure datasource field uses the UID correctly
    const queryPayload = {
      queries: queries.map((q: any) => ({
        refId: q.refId,
        datasource: {
          uid: q.datasource?.uid || 'unknown',
          type: q.datasource?.type || 'unknown',
        },
        rawSql: q.rawSql,
        format: q.format || 'table',
      })),
      range: timeRange || {
        from: 'now-7d',
        to: 'now',
      },
    };

    console.log('[@api:grafana-panel-data] Query payload:', JSON.stringify(queryPayload, null, 2));
    console.log(
      '[@api:grafana-panel-data] Request headers:',
      JSON.stringify(
        {
          Authorization: `Bearer [REDACTED]`,
          'Content-Type': 'application/json',
        },
        null,
        2,
      ),
    );

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(queryPayload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[@api:grafana-panel-data] Failed to fetch panel data:', res.status, errorText);
      return NextResponse.json(
        {
          error: 'Failed to fetch panel data from Grafana',
          status: res.status,
          details: errorText,
        },
        { status: res.status },
      );
    }

    const data = await res.json();
    console.log('[@api:grafana-panel-data] Successfully fetched panel data for panel:', panelId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('[@api:grafana-panel-data] Internal server error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 },
    );
  }
}
