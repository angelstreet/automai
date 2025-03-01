import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest, context: { params: { name: string } }) {
  try {
    const { name } = context.params;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Host name is required' },
        { status: 400 }
      );
    }

    const host = await prisma.host.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    });

    if (!host) {
      return NextResponse.json(
        { success: false, error: 'Host not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: host });
  } catch (error) {
    console.error('Error fetching host by name:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch host' },
      { status: 500 }
    );
  }
}
