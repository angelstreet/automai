'use client';

import { FolderOpen, GitBranch } from 'lucide-react';
import React, { useState } from 'react';

import { Badge } from '@/components/shadcn/badge';
import { Card } from '@/components/shadcn/card';

import FileExplorer from './FileExplorer';
import GitPanel from './GitPanel';
import MonacoEditor from './MonacoEditor';

interface FileInfo {
  name: string;
  path: string;
  content: string;
  language: string;
}

export default function CodeEditorClient() {
  const [activeTab, setActiveTab] = useState<'explorer' | 'git'>('git');
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [status, setStatus] = useState('Ready to clone repository');

  const handleFilesLoaded = (loadedFiles: FileInfo[]) => {
    console.log('[@component:CodeEditorClient] Files loaded:', loadedFiles.length);
    setFiles(loadedFiles);

    // Auto-select a good default file to display
    if (loadedFiles.length > 0) {
      const defaultFile =
        loadedFiles.find(
          (f) =>
            f.name.toLowerCase() === 'readme.md' ||
            f.name.toLowerCase() === 'index.js' ||
            f.name.toLowerCase() === 'index.ts' ||
            f.name.toLowerCase() === 'main.js' ||
            f.name.toLowerCase() === 'main.ts' ||
            f.name.toLowerCase() === 'app.js' ||
            f.name.toLowerCase() === 'app.ts',
        ) || loadedFiles[0];

      setCurrentFile(defaultFile);
      setActiveTab('explorer');
    }
  };

  const handleFileSelect = (file: FileInfo) => {
    console.log('[@component:CodeEditorClient] File selected:', file.path);
    setCurrentFile(file);
  };

  const handleStatusUpdate = (newStatus: string) => {
    console.log('[@component:CodeEditorClient] Status update:', newStatus);
    setStatus(newStatus);
  };

  return (
    <div className="h-full flex bg-background">
      {/* Activity Bar */}
      <div className="w-12 bg-muted/50 border-r flex flex-col">
        <button
          onClick={() => setActiveTab('explorer')}
          className={`w-full h-12 flex items-center justify-center border-b transition-colors ${
            activeTab === 'explorer'
              ? 'bg-accent text-accent-foreground border-l-2 border-l-accent-foreground'
              : 'hover:bg-muted text-muted-foreground'
          }`}
          title="Explorer"
        >
          <FolderOpen size={20} />
        </button>
        <button
          onClick={() => setActiveTab('git')}
          className={`w-full h-12 flex items-center justify-center border-b transition-colors ${
            activeTab === 'git'
              ? 'bg-accent text-accent-foreground border-l-2 border-l-accent-foreground'
              : 'hover:bg-muted text-muted-foreground'
          }`}
          title="Source Control"
        >
          <GitBranch size={20} />
        </button>
      </div>

      {/* Sidebar */}
      <div className="w-80 bg-muted/30 border-r flex flex-col">
        {/* Sidebar Header */}
        <div className="h-8 bg-muted/50 border-b flex items-center px-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {activeTab === 'explorer' ? 'Explorer' : 'Source Control'}
          </span>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'explorer' && (
            <FileExplorer
              files={files}
              onFileSelect={handleFileSelect}
              selectedFilePath={currentFile?.path}
            />
          )}
          {activeTab === 'git' && (
            <GitPanel onFilesLoaded={handleFilesLoaded} onStatusUpdate={handleStatusUpdate} />
          )}
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Status Bar */}
        <div className="h-8 bg-muted/50 border-b flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {currentFile && (
              <>
                <Badge variant="outline" className="text-xs">
                  {currentFile.language}
                </Badge>
                <span className="text-xs text-muted-foreground">{currentFile.path}</span>
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{status}</div>
        </div>

        {/* Editor */}
        <div className="flex-1">
          {currentFile ? (
            <MonacoEditor file={currentFile} />
          ) : (
            <div className="h-full flex items-center justify-center bg-background">
              <Card className="p-8 text-center max-w-md">
                <div className="text-6xl mb-4">👨‍💻</div>
                <h3 className="text-lg font-semibold mb-2">Welcome to Code Explorer</h3>
                <p className="text-muted-foreground mb-4">
                  Clone a Git repository to start exploring code with our VS Code-like interface.
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>✨ Full syntax highlighting</p>
                  <p>📁 File tree navigation</p>
                  <p>🔗 Universal Git provider support</p>
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
