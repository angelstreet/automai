import { NextRequest, NextResponse } from 'next/server';
import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import { rimraf } from 'rimraf';

interface FileInfo {
  name: string;
  path: string;
  content: string;
  language: string;
}

const getLanguageFromFileName = (fileName: string): string => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    php: 'php',
    cpp: 'cpp',
    c: 'c',
    cs: 'csharp',
    html: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    less: 'less',
    json: 'json',
    xml: 'xml',
    md: 'markdown',
    mdx: 'markdown',
    yml: 'yaml',
    yaml: 'yaml',
    sh: 'shell',
    bash: 'shell',
    sql: 'sql',
    dockerfile: 'dockerfile',
    gitignore: 'plaintext',
    env: 'plaintext',
  };
  return languageMap[extension || ''] || 'plaintext';
};

const getAllFilesRecursively = async (dir: string, basePath: string = ''): Promise<string[]> => {
  const allFiles: string[] = [];

  try {
    const items = await fs.readdir(dir);

    for (const item of items) {
      if (item.startsWith('.')) continue; // Skip hidden files/folders

      const fullPath = path.join(dir, item);
      const relativePath = basePath ? `${basePath}/${item}` : item;

      try {
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          const subFiles = await getAllFilesRecursively(fullPath, relativePath);
          allFiles.push(...subFiles);
        } else {
          // Only include text files
          const extension = item.split('.').pop()?.toLowerCase();
          const textExtensions = [
            'js',
            'jsx',
            'ts',
            'tsx',
            'py',
            'rb',
            'go',
            'rs',
            'java',
            'php',
            'cpp',
            'c',
            'cs',
            'html',
            'css',
            'scss',
            'sass',
            'less',
            'json',
            'xml',
            'md',
            'mdx',
            'yml',
            'yaml',
            'sh',
            'bash',
            'sql',
            'txt',
            'log',
            'env',
            'gitignore',
            'dockerfile',
            'toml',
            'ini',
          ];

          if (
            !extension ||
            textExtensions.includes(extension) ||
            ['dockerfile', 'makefile', 'readme', 'license', 'changelog'].some((name) =>
              item.toLowerCase().includes(name),
            )
          ) {
            allFiles.push(relativePath);
          }
        }
      } catch (statError) {
        console.warn(`[@api:git/clone] Could not stat ${relativePath}:`, statError);
      }
    }
  } catch (error) {
    console.warn(`[@api:git/clone] Could not read directory ${dir}:`, error);
  }

  return allFiles;
};

export async function POST(request: NextRequest) {
  try {
    const { url, credentials } = await request.json();

    console.log('[@api:git/clone] Starting repository clone:', url);

    if (!url) {
      return NextResponse.json({ error: 'Repository URL is required' }, { status: 400 });
    }

    // Create temporary directory for cloning
    const tempDir = path.join(process.cwd(), 'temp', `repo-${Date.now()}`);

    try {
      // Ensure temp directory exists
      await fs.mkdir(path.dirname(tempDir), { recursive: true });

      const git = simpleGit();

      // Configure authentication if provided
      let cloneUrl = url;
      if (credentials?.username && credentials?.password) {
        const urlObj = new URL(url);
        urlObj.username = credentials.username;
        urlObj.password = credentials.password;
        cloneUrl = urlObj.toString();
      }

      console.log('[@api:git/clone] Cloning to:', tempDir);

      // Clone repository (shallow clone for performance)
      await git.clone(cloneUrl, tempDir, ['--depth', '1']);

      console.log('[@api:git/clone] Repository cloned successfully');

      // Get repository name
      const repoName = url.split('/').pop()?.replace('.git', '') || 'repository';

      // Read all files from the cloned repository
      const allFilePaths = await getAllFilesRecursively(tempDir);
      console.log('[@api:git/clone] Found', allFilePaths.length, 'files');

      // Create FileInfo objects with actual file content
      const files: FileInfo[] = [];
      for (const filePath of allFilePaths.slice(0, 100)) {
        // Limit to 100 files for performance
        try {
          const fullPath = path.join(tempDir, filePath);
          const content = await fs.readFile(fullPath, 'utf8');
          const fileName = filePath.split('/').pop() || filePath;

          files.push({
            name: fileName,
            path: filePath,
            content: content,
            language: getLanguageFromFileName(fileName),
          });
        } catch (readError) {
          console.warn(`[@api:git/clone] Could not read file ${filePath}:`, readError);
          // Add placeholder for unreadable files
          const fileName = filePath.split('/').pop() || filePath;
          files.push({
            name: fileName,
            path: filePath,
            content: `// Could not load file content for ${filePath}`,
            language: getLanguageFromFileName(fileName),
          });
        }
      }

      console.log('[@api:git/clone] Successfully loaded', files.length, 'files');

      // Cleanup: Remove temporary directory
      await rimraf(tempDir);
      console.log('[@api:git/clone] Cleaned up temporary directory');

      return NextResponse.json({
        success: true,
        repository: {
          url,
          name: repoName,
          files,
        },
      });
    } catch (cloneError: any) {
      // Cleanup on error
      try {
        await rimraf(tempDir);
      } catch (cleanupError) {
        console.warn('[@api:git/clone] Failed to cleanup temp directory:', cleanupError);
      }

      console.error('[@api:git/clone] Clone failed:', cloneError);

      let errorMessage = 'Failed to clone repository';
      if (cloneError.message?.includes('authentication')) {
        errorMessage = 'Authentication failed. Please check your credentials.';
      } else if (cloneError.message?.includes('not found')) {
        errorMessage = 'Repository not found. Please check the URL.';
      } else if (cloneError.message?.includes('network')) {
        errorMessage = 'Network error. Please check your connection.';
      } else if (cloneError.message) {
        errorMessage = `Clone failed: ${cloneError.message}`;
      }

      return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[@api:git/clone] API error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}
