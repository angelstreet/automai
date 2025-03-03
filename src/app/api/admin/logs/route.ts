import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin status
    const session = await getServerSession(authOptions);

    if (!session || !session.user || session.user.role !== 'ADMIN') {
      logger.warn('Unauthorized access attempt to logs API', {
        userId: session?.user?.id,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'LOGS_GET_UNAUTHORIZED',
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
        },
        { status: 401 },
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = 20;

    // Since ConnectionLog model has been removed, return empty results
    logger.info('Admin fetched logs (ConnectionLog model removed)', {
      userId: session.user.id,
      action: 'LOGS_GET',
    });

    return NextResponse.json({
      success: true,
      logs: [],
      page,
      pageSize,
      totalPages: 0,
      totalLogs: 0,
    });
  } catch (error) {
    logger.error(`Error fetching logs: ${error instanceof Error ? error.message : String(error)}`, {
      action: 'LOGS_GETerror',
      data: { error: error instanceof Error ? error.message : String(error) },
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch logs',
      },
      { status: 500 },
    );
  }
}
