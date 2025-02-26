import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import { machines } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { getServerSession } from '@/server/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const name = params.name;
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Machine name is required' },
        { status: 400 }
      );
    }

    const machine = await db.query.machines.findFirst({
      where: eq(machines.name, name),
    });

    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: machine,
    });
  } catch (error) {
    console.error('Error fetching machine by name:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch machine' },
      { status: 500 }
    );
  }
} 