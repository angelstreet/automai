'use client';

interface FileInfo {
  name: string;
  path: string;
  content: string;
  language: string;
}

interface Repository {
  url: string;
  name: string;
  files: FileInfo[];
}

interface FileExplorerProps {
  repository: Repository | null;
  currentFile: FileInfo | null;
  onFileSelect: (file: FileInfo) => void;
}

export function FileExplorer({ repository, currentFile, onFileSelect }: FileExplorerProps) {
  if (!repository) {
    return (
      <div className="p-4 text-center text-gray-400">
        <div className="text-4xl mb-2">📁</div>
        <p className="text-sm">No repository opened</p>
        <p className="text-xs mt-1">Clone a repository from the Git panel</p>
      </div>
    );
  }

  const getFileIcon = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const iconMap: Record<string, string> = {
      js: '🟨',
      jsx: '🟨',
      ts: '🔷',
      tsx: '🔷',
      json: '⚙️',
      md: '📝',
      html: '🌐',
      css: '🎨',
      scss: '🎨',
      py: '🐍',
      rb: '💎',
      go: '🔷',
      rs: '🦀',
      java: '☕',
      php: '🐘',
    };
    return iconMap[extension || ''] || '📄';
  };

  // Group files by directory
  const rootFiles = repository.files.filter((file) => !file.path.includes('/'));
  const srcFiles = repository.files.filter((file) => file.path.startsWith('src/'));

  return (
    <div className="p-2">
      {/* Repository Header */}
      <div className="mb-3 pb-2 border-b border-gray-600">
        <div className="flex items-center space-x-2">
          <span className="text-xs">📦</span>
          <span className="text-sm font-medium text-gray-200">{repository.name}</span>
        </div>
        <div className="text-xs text-gray-400 mt-1 truncate" title={repository.url}>
          {repository.url}
        </div>
      </div>

      {/* Root Files */}
      <div className="space-y-1">
        {rootFiles.map((file) => {
          const isSelected = currentFile?.path === file.path;
          return (
            <button
              key={file.path}
              onClick={() => onFileSelect(file)}
              className={`w-full flex items-center space-x-2 px-2 py-1 text-left text-sm rounded ${
                isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              <span className="text-xs">{getFileIcon(file.name)}</span>
              <span>{file.name}</span>
            </button>
          );
        })}

        {/* src folder */}
        {srcFiles.length > 0 && (
          <>
            <div className="flex items-center space-x-2 px-2 py-1 text-sm text-gray-300">
              <span className="text-xs">📂</span>
              <span>src</span>
            </div>
            <div className="ml-4 space-y-1">
              {srcFiles.map((file) => {
                const isSelected = currentFile?.path === file.path;
                const fileName = file.path.replace('src/', '');
                return (
                  <button
                    key={file.path}
                    onClick={() => onFileSelect(file)}
                    className={`w-full flex items-center space-x-2 px-2 py-1 text-left text-sm rounded ${
                      isSelected ? 'bg-blue-600 text-white' : 'hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    <span className="text-xs">{getFileIcon(fileName)}</span>
                    <span>{fileName}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* File Count */}
      <div className="mt-4 pt-2 border-t border-gray-600 text-xs text-gray-400">
        {repository.files.length} files
      </div>
    </div>
  );
}
