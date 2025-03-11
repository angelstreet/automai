import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = 20;

    // Return static response
    return NextResponse.json({
      success: true,
      logs: [],
      page,
      pageSize,
      totalPages: 0,
      totalLogs: 0,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch logs',
      },
      { status: 500 },
    );
  }
}
