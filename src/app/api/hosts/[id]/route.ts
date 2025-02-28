import { NextRequest, NextResponse } from 'next/server';

import { getHostById, deleteHost } from '@/lib/services';

type Props = {
  params: { id: string };
};

export async function GET(request: NextRequest, { params }: Props) {
  try {
    const host = await getHostById(params.id);

    if (!host) {
      return NextResponse.json({ success: false, error: 'Host not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: host });
  } catch (error) {
    console.error('Error fetching host:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch host' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Props) {
  try {
    await deleteHost(params.id);

    return NextResponse.json({
      success: true,
      message: 'Host deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting host:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete host' }, { status: 500 });
  }
}
