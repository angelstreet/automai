import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

type Props = {
  params: {
    id: string;
  };
};

export async function POST(request: Request, { params }: Props) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useCase = await prisma.useCase.findUnique({
      where: { id },
    });

    if (!useCase) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 });
    }

    // Update the execution status
    const execution = await prisma.useCaseExecution.update({
      where: {
        id: useCase.id,
      },
      data: {
        status: 'STOPPED',
        endedAt: new Date(),
      },
    });

    return NextResponse.json(execution);
  } catch (error) {
    console.error('Error stopping use case:', error);
    return NextResponse.json({ error: 'Failed to stop use case' }, { status: 500 });
  }
}
