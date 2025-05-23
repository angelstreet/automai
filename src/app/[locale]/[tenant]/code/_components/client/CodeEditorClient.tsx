'use client';

import { FolderOpen, GitBranch } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useState } from 'react';

import { Badge } from '@/components/shadcn/badge';
import { Card } from '@/components/shadcn/card';

import FileExplorer from './FileExplorer';
import GitPanel from './GitPanel';

// Dynamic import for MonacoEditor to prevent SSR issues
const MonacoEditor = dynamic(() => import('./MonacoEditor'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
        <p className="text-muted-foreground text-sm">Loading Monaco Editor...</p>
      </div>
    </div>
  ),
});

interface FileInfo {
  name: string;
  path: string;
  size: number;
  language: string;
  content?: string; // Optional, loaded on demand
}

interface Repository {
  id: string;
  url: string;
  name: string;
  files: FileInfo[];
}

export default function CodeEditorClient() {
  const [activeTab, setActiveTab] = useState<'explorer' | 'git'>('git');
  const [repository, setRepository] = useState<Repository | null>(null);
  const [currentFile, setCurrentFile] = useState<FileInfo | null>(null);
  const [loadingFile, setLoadingFile] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready to clone repository');

  const handleRepositoryLoaded = (repo: Repository) => {
    console.log(
      '[@component:CodeEditorClient] Repository loaded:',
      repo.name,
      'with',
      repo.files.length,
      'files',
    );
    setRepository(repo);

    // Auto-select a good default file to display
    if (repo.files.length > 0) {
      const defaultFile =
        repo.files.find(
          (f) =>
            f.name.toLowerCase() === 'readme.md' ||
            f.name.toLowerCase() === 'index.js' ||
            f.name.toLowerCase() === 'index.ts' ||
            f.name.toLowerCase() === 'main.js' ||
            f.name.toLowerCase() === 'main.ts' ||
            f.name.toLowerCase() === 'app.js' ||
            f.name.toLowerCase() === 'app.ts',
        ) || repo.files[0];

      handleFileSelect(defaultFile);
      setActiveTab('explorer');
    }

    setStatus(`Repository loaded: ${repo.files.length} files`);
  };

  const handleFileSelect = async (file: FileInfo) => {
    console.log('[@component:CodeEditorClient] File selected:', file.path);

    // If file content is already loaded, use it
    if (file.content !== undefined) {
      setCurrentFile(file);
      return;
    }

    // Load file content on demand
    if (!repository) return;

    setLoadingFile(file.path);
    setStatus(`Loading ${file.name}...`);

    try {
      const response = await fetch('/api/git/file', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoId: repository.id,
          filePath: file.path,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to load file content');
      }

      const data = await response.json();

      if (data.success) {
        // Update file in repository with loaded content
        const fileWithContent = { ...file, content: data.content };
        setCurrentFile(fileWithContent);

        // Update repository state to cache the loaded content
        setRepository((prev) =>
          prev
            ? {
                ...prev,
                files: prev.files.map((f) => (f.path === file.path ? fileWithContent : f)),
              }
            : null,
        );

        setStatus(`Loaded ${file.name}`);
      }
    } catch (error) {
      console.error('[@component:CodeEditorClient] Failed to load file:', error);
      setStatus(`Failed to load ${file.name}`);
    } finally {
      setLoadingFile(null);
    }
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
              files={repository?.files || []}
              onFileSelect={handleFileSelect}
              selectedFilePath={currentFile?.path}
            />
          )}
          {activeTab === 'git' && (
            <GitPanel onFilesLoaded={handleRepositoryLoaded} onStatusUpdate={handleStatusUpdate} />
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
