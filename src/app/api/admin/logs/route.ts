import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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
        saveToDb: true,
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
    const level = searchParams.get('level') || undefined;
    const action = searchParams.get('action') || undefined;
    const search = searchParams.get('search') || undefined;

    // Build filter
    const filter: any = {};

    if (level) {
      filter.level = level;
    }

    if (action) {
      filter.action = {
        contains: action,
      };
    }

    if (search) {
      filter.OR = [
        { message: { contains: search, mode: 'insensitive' } },
        { action: { contains: search, mode: 'insensitive' } },
        { userId: { contains: search, mode: 'insensitive' } },
        { ip: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const totalLogs = await prisma.connectionLog.count({
      where: filter,
    });

    const totalPages = Math.ceil(totalLogs / pageSize);

    // Fetch logs with pagination
    const logs = await prisma.connectionLog.findMany({
      where: filter,
      orderBy: {
        timestamp: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    logger.info('Admin fetched logs', {
      userId: session.user.id,
      action: 'LOGS_GET',
      data: { page, filter },
      saveToDb: true,
    });

    return NextResponse.json({
      success: true,
      logs,
      page,
      pageSize,
      totalPages,
      totalLogs,
    });
  } catch (error) {
    logger.error(`Error fetching logs: ${error instanceof Error ? error.message : String(error)}`, {
      action: 'LOGS_GET_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true,
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
