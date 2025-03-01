import { NextRequest, NextResponse } from 'next/server';

import { getHostById, deleteHost } from '@/lib/services';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const host = await getHostById(id);

    if (!host) {
      return NextResponse.json({ success: false, error: 'Host not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: host });
  } catch (error) {
    console.error('Error fetching host:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch host' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await deleteHost(id);

    return NextResponse.json({
      success: true,
      message: 'Host deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting host:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete host' }, { status: 500 });
  }
}
