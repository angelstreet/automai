import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Props = {
  params: { id: string };
};

export async function GET(request: Request, { params }: Props) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useCase = await prisma.useCase.findUnique({
      where: { id: params.id },
      include: {
        executions: {
          orderBy: {
            startedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!useCase) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 });
    }

    const latestExecution = useCase.executions?.[0];
    const status = latestExecution?.status || 'NOT_STARTED';

    return NextResponse.json({ status });
  } catch (error) {
    console.error('Error getting use case status:', error);
    return NextResponse.json({ error: 'Failed to get use case status' }, { status: 500 });
  }
}
