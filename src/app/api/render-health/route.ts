import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[@api:render-health] Sending request to wake up Render service');
    const renderUrl = process.env.NEXT_PUBLIC_RENDER_URL;
    if (!renderUrl) {
      console.error('[@api:render-health] Render service URL is not defined');
      return NextResponse.json({ success: false, error: 'Render service URL is not defined' });
    }
    const response = await fetch(`${renderUrl}/health`, { method: 'GET' });
    if (response.ok) {
      console.log('[@api:render-health] Render service is awake');
      return NextResponse.json({ success: true, message: 'Render service is awake' });
    } else {
      console.log('[@api:render-health] Render service is waking up');
      return NextResponse.json({
        success: true,
        message: 'Render service is waking up, please wait',
      });
    }
  } catch (error: any) {
    console.error('[@api:render-health] Error waking up Render service:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to wake up Render service' });
  }
}
