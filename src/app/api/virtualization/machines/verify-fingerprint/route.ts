import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';

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
    const { type, ip, port, username, password, fingerprint, accept } = body;

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

    // Store the verified fingerprint in the database
    try {
      // Check if we already have a stored fingerprint for this host
      const existingFingerprint = await prisma.hostFingerprint.findFirst({
        where: {
          host: ip,
          userId: userId
        }
      });
      
      if (existingFingerprint) {
        // Update the existing fingerprint
        await prisma.hostFingerprint.update({
          where: { id: existingFingerprint.id },
          data: {
            fingerprint: fingerprint,
            verified: true,
            updatedAt: new Date()
          }
        });
        
        logger.info(`Updated fingerprint for ${ip}`, { 
          userId: session.user.id, 
          tenantId: session.user.tenantId,
          action: 'FINGERPRINT_VERIFY_UPDATED',
          data: { ip, fingerprint },
          saveToDb: true
        });
      } else {
        // Create a new fingerprint record
        await prisma.hostFingerprint.create({
          data: {
            host: ip,
            port: port ? parseInt(port) : 22,
            fingerprint: fingerprint,
            verified: true,
            userId: userId,
            tenantId: tenantId || undefined
          }
        });
        
        logger.info(`Stored new fingerprint for ${ip}`, { 
          userId: session.user.id, 
          tenantId: session.user.tenantId,
          action: 'FINGERPRINT_VERIFY_STORED',
          data: { ip, fingerprint },
          saveToDb: true
        });
      }
    } catch (dbError) {
      // If there's an error storing the fingerprint, log it but continue
      // This might happen if the HostFingerprint model doesn't exist yet
      logger.error(`Error storing fingerprint: ${dbError.message}`, { 
        userId: session.user.id, 
        tenantId: session.user.tenantId,
        action: 'FINGERPRINT_VERIFY_DB_ERROR',
        data: { ip, fingerprint, error: dbError.message },
        saveToDb: true
      });
      
      // Continue with the verification process even if storage fails
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