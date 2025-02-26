import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

// POST /api/virtualization/machines/verify-fingerprint
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      logger.warn('Unauthorized access attempt to verify fingerprint endpoint', { 
        userId: session?.user?.id, 
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'VERIFY_FINGERPRINT_UNAUTHORIZED',
        saveToDb: true 
      });
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      }, { status: 401 });
    }
    
    const body = await request.json();
    const { fingerprint, accept } = body;

    logger.info(`Verifying SSH fingerprint`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'VERIFY_FINGERPRINT_INITIATED',
      data: { fingerprint, accept },
      saveToDb: true
    });

    // In a real implementation, we would store the fingerprint in the database
    // For now, we'll just return success if accept is true
    if (accept) {
      return NextResponse.json({
        success: true,
        message: 'Fingerprint verified successfully',
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Fingerprint rejected',
      }, { status: 400 });
    }
  } catch (error) {
    logger.error(`Error verifying fingerprint: ${error.message}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'VERIFY_FINGERPRINT_ERROR',
      data: { error: error.message },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
} 