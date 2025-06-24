import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { repoId, filePath } = await request.json();

    console.log('[@api:git/file] Fetching file:', filePath, 'from repo:', repoId);

    if (!repoId || !filePath) {
      return NextResponse.json(
        { error: 'Repository ID and file path are required' },
        { status: 400 },
      );
    }

    // Construct path to the temporary repository
    const repoTempDir = path.join(process.cwd(), 'temp', repoId);
    const fullFilePath = path.join(repoTempDir, filePath);

    // Security check: ensure file is within the repo directory
    if (!fullFilePath.startsWith(repoTempDir)) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    try {
      // Check if repository still exists
      await fs.access(repoTempDir);

      // Read file content
      const content = await fs.readFile(fullFilePath, 'utf8');

      console.log('[@api:git/file] Successfully loaded file:', filePath);

      return NextResponse.json({
        success: true,
        content,
      });
    } catch (fileError: any) {
      if (fileError.code === 'ENOENT') {
        return NextResponse.json(
          {
            error: 'Repository or file not found. Repository may have been cleaned up.',
          },
          { status: 404 },
        );
      }

      console.error('[@api:git/file] Failed to read file:', fileError);
      return NextResponse.json(
        {
          error: 'Failed to read file content',
        },
        { status: 500 },
      );
    }
  } catch (error: any) {
    console.error('[@api:git/file] API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
