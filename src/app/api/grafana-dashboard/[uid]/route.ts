import { NextRequest, NextResponse } from 'next/server';

export async function GET(_request: NextRequest, { params }: { params: { uid: string } }) {
  if (!params) {
    return NextResponse.json({ error: 'Missing UID parameter' }, { status: 400 });
  }

  const apiKey = process.env.GRAFANA_API_TOKEN;
  const baseUrl = process.env.GRAFANA_URL;

  if (!apiKey || !baseUrl) {
    return NextResponse.json({ error: 'Grafana API token or URL not configured' }, { status: 500 });
  }

  const url = `${baseUrl}/api/dashboards/uid/${params.uid}`;

  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch dashboard from Grafana', status: res.status },
        { status: res.status },
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 },
    );
  }
}
