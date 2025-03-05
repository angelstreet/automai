import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

// Find the next available number for a prefix
async function findNextNumber(prefix: string) {
  const useCases = await db.useCase.findMany({
    where: {
      shortId: {
        startsWith: `${prefix}-`,
      },
    },
    orderBy: {
      shortId: 'desc',
    },
  });

  if (useCases.length === 0) {
    return 1;
  }

  let highestNumber = 0;
  for (const useCase of useCases) {
    const parts = useCase.shortId.split('-');
    if (parts.length === 2) {
      const num = parseInt(parts[1], 10);
      if (!isNaN(num) && num > highestNumber) {
        highestNumber = num;
      }
    }
  }

  return highestNumber + 1;
}

// Generate a sequential short ID (e.g., WEB-1, WEB-2, etc.)
async function generateShortId(prefix: string) {
  const nextNumber = await findNextNumber(prefix);
  return `${prefix}-${nextNumber}`;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const useCases = await db.useCase.findMany({
      where: {
        projectId: String(projectId),
      },
      include: {
        project: true,
        executions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    return NextResponse.json(useCases);
  } catch (error) {
    console.error('Error fetching use cases:', error);
    return NextResponse.json({ error: 'Failed to fetch use cases' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, projectId, steps, shortIdPrefix } = await request.json();

    if (!name || !projectId || !steps || !shortIdPrefix) {
      return NextResponse.json(
        { error: 'Name, projectId, steps, and shortIdPrefix are required' },
        { status: 400 },
      );
    }

    const shortId = await generateShortId(shortIdPrefix);

    const useCase = await db.useCase.create({
      data: {
        name,
        projectId,
        steps,
        shortId,
      },
      include: {
        project: true,
      },
    });

    return NextResponse.json(useCase, { status: 201 });
  } catch (error) {
    console.error('Error creating use case:', error);
    return NextResponse.json({ error: 'Failed to create use case' }, { status: 500 });
  }
}
