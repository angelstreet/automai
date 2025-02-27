import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const useCase = await prisma.useCase.findUnique({
      where: { id: params.id },
      include: {
        executions: {
          where: {
            status: 'RUNNING',
          },
          orderBy: {
            startedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!useCase) {
      return NextResponse.json(
        { error: 'Use case not found' },
        { status: 404 }
      );
    }

    if (!useCase.executions?.[0]) {
      return NextResponse.json(
        { error: 'No running execution found' },
        { status: 400 }
      );
    }

    // Update the execution status
    const execution = await prisma.useCaseExecution.update({
      where: { id: useCase.executions[0].id },
      data: {
        status: 'STOPPED',
        endedAt: new Date(),
      },
    });

    // TODO: Implement actual use case stopping logic here
    // This could involve terminating Playwright scripts, etc.

    return NextResponse.json(execution);
  } catch (error) {
    console.error('Error stopping use case:', error);
    return NextResponse.json(
      { error: 'Failed to stop use case' },
      { status: 500 }
    );
  }
} 