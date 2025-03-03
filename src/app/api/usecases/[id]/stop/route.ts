import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

type Props = {
  params: {
    id: string;
  };
};

type TestCase = {
  id: string;
  executions: Array<{
    id: string;
    status: string;
  }>;
};

export async function POST(request: Request, { params }: Props) {
  try {
    const { id } = params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find the test case
    const testCase = await prisma.useCase.findUnique({
      where: { id },
      include: {
        executions: {
          where: {
            status: 'RUNNING',
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    }) as TestCase | null;

    if (!testCase) {
      return NextResponse.json({ error: 'Test case not found' }, { status: 404 });
    }

    if (!testCase.executions?.[0]) {
      return NextResponse.json({ error: 'No running execution found' }, { status: 404 });
    }

    // Update the execution status
    const updatedExecution = await prisma.useCaseExecution.update({
      where: {
        id: testCase.executions[0].id,
      },
      data: {
        status: 'STOPPED',
        endedAt: new Date(),
      },
    });

    return NextResponse.json(updatedExecution);
  } catch (error) {
    console.error('Error stopping test case:', error);
    return NextResponse.json({ error: 'Failed to stop test case' }, { status: 500 });
  }
}
