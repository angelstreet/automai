'use client';

import { useState, useCallback } from 'react';
import { MonacoEditor } from './MonacoEditor';
import { FileExplorer } from './FileExplorer';
import { GitPanel } from './GitPanel';

interface FileInfo {
  name: string;
  path: string;
  content: string;
  language: string;
}

type SidebarTab = 'explorer' | 'git';

export function CodeEditorClient() {
  const [activeTab, setActiveTab] = useState<SidebarTab>('explorer');
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [repositoryInfo, setRepositoryInfo] = useState<{
    url: string;
    name: string;
    files: FileInfo[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cloneError, setCloneError] = useState<string | null>(null);

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

  const readFileFromFS = async (fs: any, filePath: string): Promise<string> => {
    try {
      const data = await fs.promises.readFile(`/repo/${filePath}`, { encoding: 'utf8' });
      return data;
    } catch (error) {
      console.warn(`[@component:CodeEditorClient] Could not read file ${filePath}:`, error);
      return `// Could not load file content for ${filePath}`;
    }
  };

  const getAllFilesRecursively = async (
    fs: any,
    dir: string = '',
    allFiles: string[] = [],
  ): Promise<string[]> => {
    try {
      const fullPath = dir ? `/repo/${dir}` : '/repo';
      const items = await fs.promises.readdir(fullPath);

      for (const item of items) {
        if (item.startsWith('.')) continue; // Skip hidden files/folders

        const itemPath = dir ? `${dir}/${item}` : item;
        const fullItemPath = `/repo/${itemPath}`;

        try {
          const stat = await fs.promises.stat(fullItemPath);
          if (stat.isDirectory()) {
            await getAllFilesRecursively(fs, itemPath, allFiles);
          } else {
            // Only include text files (avoid binary files)
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
              allFiles.push(itemPath);
            }
          }
        } catch (statError) {
          console.warn(`[@component:CodeEditorClient] Could not stat ${itemPath}:`, statError);
        }
      }
    } catch (error) {
      console.warn(`[@component:CodeEditorClient] Could not read directory ${dir}:`, error);
    }

    return allFiles;
  };

  const handleRepositoryClone = useCallback(
    async (url: string, credentials?: { username: string; password: string }) => {
      setIsLoading(true);
      setCloneError(null);

      try {
        console.log('[@component:CodeEditorClient] Starting real repository clone:', url);

        // Dynamic imports for isomorphic-git
        const [git, http, { LightningFS }] = await Promise.all([
          import('isomorphic-git'),
          import('isomorphic-git/http/web'),
          import('@isomorphic-git/lightning-fs'),
        ]);

        // Create file system
        const fs = new LightningFS('fs');

        // Clear any existing repository
        try {
          await fs.promises.rmdir('/repo', { recursive: true });
        } catch (error) {
          // Directory might not exist, that's fine
        }

        console.log('[@component:CodeEditorClient] Cloning repository...');

        // Clone repository
        await git.default.clone({
          fs,
          http: http.default,
          dir: '/repo',
          url: url,
          singleBranch: true,
          depth: 1, // Shallow clone for faster performance
          onAuth: credentials ? () => credentials : undefined,
          onProgress: (progress) => {
            console.log('[@component:CodeEditorClient] Clone progress:', progress);
          },
        });

        console.log('[@component:CodeEditorClient] Repository cloned successfully');

        // Get repository name
        const repoName = url.split('/').pop()?.replace('.git', '') || 'repository';

        // Read all files from the cloned repository
        const allFilePaths = await getAllFilesRecursively(fs);
        console.log('[@component:CodeEditorClient] Found files:', allFilePaths);

        // Create FileInfo objects with actual file content
        const files: FileInfo[] = [];
        for (const filePath of allFilePaths.slice(0, 50)) {
          // Limit to 50 files for performance
          const content = await readFileFromFS(fs, filePath);
          const fileName = filePath.split('/').pop() || filePath;

          files.push({
            name: fileName,
            path: filePath,
            content: content,
            language: getLanguageFromFileName(fileName),
          });
        }

        console.log('[@component:CodeEditorClient] Successfully loaded', files.length, 'files');

        setRepositoryInfo({ url, name: repoName, files });

        // Open README.md if it exists, otherwise open the first file
        const readmeFile = files.find((f) => f.name.toLowerCase().includes('readme'));
        const firstFile = readmeFile || files[0];

        if (firstFile) {
          setCurrentFile(firstFile);
        }

        setActiveTab('explorer');
      } catch (error: any) {
        console.error('[@component:CodeEditorClient] Failed to clone repository:', error);
        let errorMessage = 'Failed to clone repository.';

        if (error.message?.includes('authentication')) {
          errorMessage = 'Authentication failed. Please check your credentials.';
        } else if (error.message?.includes('not found')) {
          errorMessage = 'Repository not found. Please check the URL.';
        } else if (error.message?.includes('network')) {
          errorMessage = 'Network error. Please check your connection.';
        } else if (error.message) {
          errorMessage = `Clone failed: ${error.message}`;
        }

        setCloneError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handleFileSelect = useCallback((file: FileInfo) => {
    setCurrentFile(file);
  }, []);

  const handleFileContentChange = useCallback(
    (content: string) => {
      if (currentFile && repositoryInfo) {
        const updatedFiles = repositoryInfo.files.map((file) =>
          file.path === currentFile.path ? { ...file, content } : file,
        );
        setRepositoryInfo({ ...repositoryInfo, files: updatedFiles });
        setCurrentFile({ ...currentFile, content });
      }
    },
    [currentFile, repositoryInfo],
  );

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Activity Bar */}
      <div className="w-12 bg-gray-800 flex flex-col items-center py-2 space-y-2">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
            activeTab === 'explorer' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
          title="Explorer"
        >
          📁
        </button>
        <button
          onClick={() => setActiveTab('git')}
          className={`w-8 h-8 rounded flex items-center justify-center text-sm ${
            activeTab === 'git' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
          }`}
          title="Source Control"
        >
          🔀
        </button>
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-gray-850 border-r border-gray-700 flex flex-col">
        <div className="p-3 border-b border-gray-700">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-300">
            {activeTab === 'explorer' ? 'Explorer' : 'Source Control'}
          </h2>
        </div>

        <div className="flex-1 overflow-auto">
          {activeTab === 'explorer' && (
            <FileExplorer
              repository={repositoryInfo}
              currentFile={currentFile}
              onFileSelect={handleFileSelect}
            />
          )}
          {activeTab === 'git' && (
            <GitPanel
              repository={repositoryInfo}
              onRepositoryClone={handleRepositoryClone}
              isLoading={isLoading}
              error={cloneError}
            />
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Tab Bar */}
        {currentFile && (
          <div className="bg-gray-800 border-b border-gray-700 px-3 py-1 flex items-center">
            <div className="flex items-center space-x-2 bg-gray-700 px-3 py-1 rounded-t">
              <span className="text-sm">{currentFile.name}</span>
              <button
                className="text-gray-400 hover:text-white text-xs"
                onClick={() => setCurrentFile(null)}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Editor */}
        <div className="flex-1">
          {currentFile ? (
            <MonacoEditor
              content={currentFile.content}
              language={currentFile.language}
              theme="vs-dark"
              onChange={handleFileContentChange}
              height={undefined} // Use full height
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-900">
              <div className="text-center text-gray-400">
                <div className="text-6xl mb-4">📝</div>
                <h3 className="text-xl mb-2">Welcome to Code Editor</h3>
                <p className="text-sm">
                  {repositoryInfo
                    ? 'Select a file from the Explorer to start editing'
                    : 'Clone a repository from the Git panel to get started'}
                </p>
                {repositoryInfo && (
                  <p className="text-xs mt-2 text-gray-500">
                    Repository: {repositoryInfo.name} ({repositoryInfo.files.length} files loaded)
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
