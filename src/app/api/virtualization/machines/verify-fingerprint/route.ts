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
    const { type, ip, port, fingerprint, accept } = body;

    logger.info(`Verifying SSH fingerprint for ${ip}:${port || 22}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'VERIFY_FINGERPRINT_INITIATED',
      data: { type, ip, port, fingerprint, accept },
      saveToDb: true
    });

    // Check if fingerprint already exists
    const existingFingerprint = await prisma.hostFingerprint.findFirst({
      where: {
        host: ip,
        port: port || 22,
        userId: session.user.id
      }
    });

    if (existingFingerprint) {
      logger.info(`Found existing fingerprint for ${ip}:${port || 22}`, { 
        userId: session?.user?.id,
        action: 'VERIFY_FINGERPRINT_EXISTING',
        data: { 
          ip, 
          port,
          existingFingerprint: existingFingerprint.fingerprint,
          newFingerprint: fingerprint,
          verified: existingFingerprint.verified
        }
      });
    }

    if (accept) {
      // Store or update fingerprint
      const hostFingerprint = await prisma.hostFingerprint.upsert({
        where: {
          host_userId: {
            host: ip,
            userId: session.user.id
          }
        },
        update: {
          fingerprint,
          verified: true,
          port: port || 22
        },
        create: {
          host: ip,
          port: port || 22,
          fingerprint,
          verified: true,
          userId: session.user.id,
          tenantId: session.user.tenantId || undefined
        }
      });

      logger.info(`Successfully verified fingerprint for ${ip}:${port || 22}`, { 
        userId: session?.user?.id, 
        tenantId: session?.user?.tenantId,
        action: 'VERIFY_FINGERPRINT_SUCCESS',
        data: { 
          ip, 
          port,
          fingerprint: hostFingerprint.fingerprint,
          verified: hostFingerprint.verified
        },
        saveToDb: true
      });

      return NextResponse.json({
        success: true,
        message: 'Fingerprint verified successfully',
        data: hostFingerprint
      });
    } else {
      logger.warn(`User rejected fingerprint for ${ip}:${port || 22}`, { 
        userId: session?.user?.id, 
        tenantId: session?.user?.tenantId,
        action: 'VERIFY_FINGERPRINT_REJECTED',
        data: { ip, port, fingerprint },
        saveToDb: true
      });

      return NextResponse.json({
        success: false,
        message: 'Fingerprint rejected',
      }, { status: 400 });
    }
  } catch (error) {
    logger.error(`Error verifying fingerprint: ${error instanceof Error ? error.message : String(error)}`, { 
      userId: session?.user?.id, 
      tenantId: session?.user?.tenantId,
      action: 'VERIFY_FINGERPRINT_ERROR',
      data: { error: error instanceof Error ? error.message : String(error) },
      saveToDb: true
    });
    
    return NextResponse.json({
      success: false,
      message: 'Failed to verify fingerprint',
    }, { status: 500 });
  }
} 