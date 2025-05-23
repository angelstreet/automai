'use client';

import {
  AlertCircle,
  Download,
  Eye,
  File,
  CheckCircle,
  X,
  GitBranch,
  MessageSquare,
  Upload,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { getGitStatus, commitChanges, pushChanges } from '@/app/actions/gitActions';
import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';
import { Textarea } from '@/components/shadcn/textarea';

interface FileInfo {
  name: string;
  path: string;
  size: number;
  language: string;
  content?: string; // Optional, loaded on demand
  isModified?: boolean; // Track if file has been modified
}

interface Repository {
  id: string;
  url: string;
  name: string;
  files: FileInfo[];
}

interface GitPanelClientProps {
  onFilesLoaded: (repository: Repository) => void;
  onStatusUpdate: (status: string) => void;
  modifiedFiles?: FileInfo[]; // Files that have been modified in the editor
  repository?: Repository | null; // Current repository state from parent
}

export default function GitPanelClient({
  onFilesLoaded,
  onStatusUpdate,
  modifiedFiles = [],
  repository = null,
}: GitPanelClientProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [showCredentials, setShowCredentials] = useState(false);

  // Git operations state
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [gitStatus, setGitStatus] = useState<any>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);

  useEffect(() => {
    // Set default repository URL for testing
    setRepoUrl('https://github.com/angelstreet/automai.git');
  }, []);

  const handleClone = async () => {
    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    setIsCloning(true);
    setError(null);
    onStatusUpdate('Cloning repository...');

    try {
      console.log('[@component:GitPanelClient] Starting clone via API:', repoUrl);

      const response = await fetch('/api/git/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: repoUrl,
          credentials: showCredentials ? credentials : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clone repository');
      }

      const data = await response.json();

      if (data.success && data.repository) {
        console.log(
          '[@component:GitPanelClient] Successfully cloned repository:',
          data.repository.name,
        );
        console.log('[@component:GitPanelClient] Loaded', data.repository.files.length, 'files');
        console.log('[@component:GitPanelClient] Sample file structure:', data.repository.files[0]);

        onFilesLoaded(data.repository);
        onStatusUpdate(`Explore ${data.repository.files.length} files`);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: any) {
      console.error('[@component:GitPanelClient] Clone failed:', error);
      setError(error.message || 'Failed to clone repository');
      onStatusUpdate('Clone failed');
    } finally {
      setIsCloning(false);
    }
  };

  const handleClear = () => {
    console.log('[@component:GitPanelClient] Clearing repository data');
    setError(null);
    onFilesLoaded({ id: '', url: '', name: '', files: [] });
    onStatusUpdate('Repository cleared');
  };

  const getGitProvider = (url: string) => {
    if (url.includes('github.com')) return 'GitHub';
    if (url.includes('gitlab.com')) return 'GitLab';
    if (url.includes('bitbucket.org')) return 'Bitbucket';
    return 'Git';
  };

  // Git operations functions
  const handleGetStatus = async () => {
    if (!repository) return;

    setIsLoadingStatus(true);
    setError(null);

    try {
      console.log('[@component:GitPanelClient] Getting git status');
      const result = await getGitStatus(repository.id);

      if (result.success) {
        setGitStatus(result.status);
        console.log('[@component:GitPanelClient] Git status loaded:', result.status);
      } else {
        setError(result.error || 'Failed to get git status');
      }
    } catch (error: any) {
      console.error('[@component:GitPanelClient] Error getting status:', error);
      setError('Failed to get git status');
    } finally {
      setIsLoadingStatus(false);
    }
  };

  const handleCommit = async () => {
    if (!repository || !commitMessage.trim()) {
      setError('Please enter a commit message');
      return;
    }

    if (modifiedFiles.length === 0) {
      setError('No files to commit');
      return;
    }

    setIsCommitting(true);
    setError(null);
    onStatusUpdate('Committing changes...');

    try {
      console.log('[@component:GitPanelClient] Starting commit with message:', commitMessage);

      // Prepare modified files for commit
      const filesToCommit = modifiedFiles
        .filter((file) => file.isModified && file.content !== undefined)
        .map((file) => ({
          path: file.path,
          content: file.content!,
        }));

      const result = await commitChanges(repository.id, commitMessage, filesToCommit);

      if (result.success) {
        console.log('[@component:GitPanelClient] Commit successful:', result.commit?.hash);
        setCommitMessage('');
        onStatusUpdate(`Committed: ${result.commit?.hash?.substring(0, 7)}`);

        // Refresh git status after commit
        await handleGetStatus();
      } else {
        setError(result.error || 'Failed to commit changes');
        onStatusUpdate('Commit failed');
      }
    } catch (error: any) {
      console.error('[@component:GitPanelClient] Commit error:', error);
      setError('Failed to commit changes');
      onStatusUpdate('Commit failed');
    } finally {
      setIsCommitting(false);
    }
  };

  const handlePush = async () => {
    if (!repository) return;

    setIsPushing(true);
    setError(null);
    onStatusUpdate('Pushing to remote...');

    try {
      console.log('[@component:GitPanelClient] Starting push');
      const result = await pushChanges(repository.id);

      if (result.success) {
        console.log('[@component:GitPanelClient] Push successful');
        onStatusUpdate('Push successful');

        // Refresh git status after push
        await handleGetStatus();
      } else {
        setError(result.error || 'Failed to push changes');
        onStatusUpdate('Push failed');
      }
    } catch (error: any) {
      console.error('[@component:GitPanelClient] Push error:', error);
      setError('Failed to push changes');
      onStatusUpdate('Push failed');
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Git Operations - Simple like VS Code */}
      {repository ? (
        <div className="flex-1 flex flex-col">
          {/* Header - Simple */}
          <div className="p-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{repository.name}</span>
                <Badge variant="outline" className="text-xs">
                  {getGitProvider(repository.url)}
                </Badge>
              </div>
              <Button onClick={handleClear} variant="outline" size="sm" className="text-xs h-7">
                Clone Different Repository
              </Button>
            </div>
          </div>

          {/* Commit Message Input - Top like VS Code */}
          <div className="p-3 border-b">
            <Textarea
              placeholder="Message (press Ctrl+Enter to commit)"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="text-sm resize-none border-0 bg-muted/30 focus-visible:ring-1"
              rows={2}
              disabled={isCommitting}
            />
            <div className="mt-2 flex gap-2">
              <Button
                onClick={handleCommit}
                disabled={
                  isCommitting ||
                  !commitMessage.trim() ||
                  modifiedFiles.filter((f) => f.isModified).length === 0
                }
                size="sm"
                className="text-xs h-8"
              >
                {isCommitting ? 'Committing...' : 'Commit'}
              </Button>
              <Button
                onClick={handlePush}
                disabled={isPushing}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                {isPushing ? 'Pushing...' : 'Push'}
              </Button>
              <Button
                onClick={handleGetStatus}
                disabled={isLoadingStatus}
                variant="outline"
                size="sm"
                className="text-xs h-8"
              >
                {isLoadingStatus ? 'Loading...' : 'Status'}
              </Button>
            </div>
          </div>

          {/* Changes Section - Like VS Code */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-3">
              <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                Changes{' '}
                {modifiedFiles.filter((f) => f.isModified).length > 0 &&
                  `(${modifiedFiles.filter((f) => f.isModified).length})`}
              </div>

              {modifiedFiles.filter((f) => f.isModified).length > 0 ? (
                <div className="space-y-1">
                  {modifiedFiles
                    .filter((f) => f.isModified)
                    .map((file) => (
                      <div
                        key={file.path}
                        className="flex items-center gap-2 p-1 rounded hover:bg-muted/50 text-xs"
                      >
                        <span className="text-orange-500 font-bold w-4">M</span>
                        <span className="truncate font-mono">{file.path}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground py-4 text-center">No changes</div>
              )}
            </div>

            {/* Git Status Display */}
            {gitStatus && (
              <div className="p-3 border-t">
                <div className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                  Repository Status
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Branch:</span>
                    <span className="font-mono">{gitStatus.current || 'unknown'}</span>
                  </div>
                  {gitStatus.ahead > 0 && (
                    <div className="text-green-600 dark:text-green-400">
                      ↑ {gitStatus.ahead} ahead
                    </div>
                  )}
                  {gitStatus.behind > 0 && (
                    <div className="text-orange-600 dark:text-orange-400">
                      ↓ {gitStatus.behind} behind
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Clone Repository - Clean Initial State */
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-md space-y-4">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium">Clone Repository</h3>
              <p className="text-sm text-muted-foreground">
                Clone a Git repository to start working with code
              </p>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Repository URL"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={isCloning}
                className="text-sm"
              />

              <Button
                onClick={handleClone}
                disabled={isCloning || !repoUrl.trim()}
                className="w-full"
                size="sm"
              >
                <Download size={14} className="mr-2" />
                {isCloning ? 'Cloning...' : 'Clone Repository'}
              </Button>

              {/* Authentication - Collapsible */}
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCredentials(!showCredentials)}
                  className="text-xs p-0 h-auto"
                >
                  {showCredentials ? 'Hide' : 'Show'} Authentication
                </Button>

                {showCredentials && (
                  <div className="space-y-2 p-3 border rounded bg-muted/20">
                    <Input
                      type="text"
                      placeholder="Username or token"
                      value={credentials.username}
                      onChange={(e) =>
                        setCredentials((prev) => ({ ...prev, username: e.target.value }))
                      }
                      className="text-sm h-8"
                    />
                    <Input
                      type="password"
                      placeholder="Password or token"
                      value={credentials.password}
                      onChange={(e) =>
                        setCredentials((prev) => ({ ...prev, password: e.target.value }))
                      }
                      className="text-sm h-8"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="text-xs text-muted-foreground text-center space-y-1 pt-4">
              <p>Supports GitHub, GitLab, Bitbucket</p>
              <p>Use personal access tokens for private repos</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Display - Fixed Position */}
      {error && (
        <div className="p-3 border-t">
          <Alert className="border-destructive/50 text-destructive">
            <AlertCircle size={16} />
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
