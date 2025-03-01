import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Props = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useCase = await prisma.useCase.findUnique({
      where: { id: id },
    });

    if (!useCase) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 });
    }

    // Create an execution record
    const execution = await prisma.useCaseExecution.create({
      data: {
        useCaseId: id,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    // TODO: Implement actual use case execution logic here
    // This could involve running Playwright scripts, etc.

    return NextResponse.json(execution);
  } catch (error) {
    console.error('Error running use case:', error);
    return NextResponse.json({ error: 'Failed to run use case' }, { status: 500 });
  }
}
