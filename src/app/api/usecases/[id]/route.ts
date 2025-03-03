import { NextResponse } from 'next/server';

/* eslint-disable @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars */
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const useCase = await prisma.useCase.findFirst({
      where: {
        OR: [{ id: id }, { shortId: id }],
      },
      include: {
        project: true,
        executions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!useCase) {
      return NextResponse.json({ error: 'Use case not found' }, { status: 404 });
    }

    return NextResponse.json(useCase);
  } catch (error) {
    console.error('Error fetching use case:', error);
    return NextResponse.json({ error: 'Failed to fetch use case' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, steps } = await request.json();

    if (!name && !steps) {
      return NextResponse.json({ error: 'Name or steps are required' }, { status: 400 });
    }

    const useCase = await prisma.useCase.update({
      where: { id: id },
      data: {
        ...(name && { name }),
        ...(steps && { steps }),
      },
    });

    return NextResponse.json(useCase);
  } catch (error) {
    console.error('Error updating use case:', error);
    return NextResponse.json({ error: 'Failed to update use case' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Props) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.useCase.delete({
      where: { id: id },
    });

    return new NextResponse(_null, { status: 204 });
  } catch (error) {
    console.error('Error deleting use case:', error);
    return NextResponse.json({ error: 'Failed to delete use case' }, { status: 500 });
  }
}
