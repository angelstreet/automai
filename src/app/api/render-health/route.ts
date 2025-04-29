import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('[@api:render-health] Sending request to wake up Render service');
    const response = await fetch(`${process.env.RENDER_SERVICE_URL}/health`, { method: 'GET' });
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
