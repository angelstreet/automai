import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

// POST /api/virtualization/machines/verify-fingerprint
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      logger.warn('Unauthorized access attempt to verify fingerprint', { 
        userId: session?.user?.id, 
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        action: 'FINGERPRINT_VERIFY_UNAUTHORIZED',
        saveToDb: true 
      });
      return NextResponse.json({
        success: false,
        message: 'Unauthorized',
      }, { status: 401 });
    }
    
    const userId = session.user.id;
    const tenantId = session.user.tenantId;
    const body = await request.json();
    const { type, ip, port, user, password, fingerprint, accept } = body;

    logger.info(`Verifying ${type} fingerprint`, { 
      userId: session.user.id, 
      tenantId: session.user.tenantId,
      action: 'FINGERPRINT_VERIFY_INITIATED',
      data: { type, ip, fingerprint },
      saveToDb: true
    });

    if (!fingerprint) {
      return NextResponse.json({
        success: false,
        message: 'Fingerprint is required',
      }, { status: 400 });
    }

    if (!accept) {
      logger.info(`User rejected fingerprint for ${ip}`, { 
        userId: session.user.id, 
        tenantId: session.user.tenantId,
        action: 'FINGERPRINT_VERIFY_REJECTED',
        data: { ip, fingerprint },
        saveToDb: true
      });
      
      return NextResponse.json({
        success: false,
        message: 'Fingerprint verification rejected by user',
      }, { status: 400 });
    }

    // In a real implementation, we would store the verified fingerprint
    // For demo purposes, we'll just accept any fingerprint that the user approves
    
    // Special case for testing
    if (fingerprint === 'UNKNOWN_FINGERPRINT') {
      logger.info(`User accepted unknown fingerprint for ${ip}`, { 
        userId: session.user.id, 
        tenantId: session.user.tenantId,
        action: 'FINGERPRINT_VERIFY_ACCEPTED_UNKNOWN',
        data: { ip, fingerprint },
        saveToDb: true
      });
    }
    
    logger.info(`Fingerprint verified for ${ip}`, { 
      userId: session.user.id, 
      tenantId: session.user.tenantId,
      action: 'FINGERPRINT_VERIFY_SUCCESS',
      data: { ip, fingerprint },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: true,
      message: 'Fingerprint verified',
      fingerprint,
      fingerprintVerified: true
    });
  } catch (error) {
    logger.error(`Error verifying fingerprint: ${error instanceof Error ? error.message : String(error)}`, {
      action: 'FINGERPRINT_VERIFY_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
    }, { status: 500 });
  }
} 