'use client';

import { AlertCircle, Download, Eye, File, CheckCircle, X, GitBranch } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Alert, AlertDescription } from '@/components/shadcn/alert';
import { Badge } from '@/components/shadcn/badge';
import { Button } from '@/components/shadcn/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/shadcn/card';
import { Input } from '@/components/shadcn/input';

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

interface GitPanelClientProps {
  onFilesLoaded: (repository: Repository) => void;
  onStatusUpdate: (status: string) => void;
}

export default function GitPanelClient({ onFilesLoaded, onStatusUpdate }: GitPanelClientProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [isCloning, setIsCloning] = useState(false);
  const [repository, setRepository] = useState<Repository | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
  });
  const [showCredentials, setShowCredentials] = useState(false);

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

        setRepository(data.repository);
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
    setRepository(null);
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

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Clone Repository</h3>

        <div className="space-y-2">
          <Input
            placeholder="https://github.com/user/repo.git"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            disabled={isCloning}
            className="text-sm"
          />

          <div className="flex items-center gap-2">
            <Button
              onClick={handleClone}
              disabled={isCloning || !repoUrl.trim()}
              size="sm"
              className="flex items-center gap-2"
            >
              <Download size={14} />
              {isCloning ? 'Cloning...' : 'Clone'}
            </Button>

            {repository && (
              <Button
                onClick={handleClear}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <X size={14} />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Authentication Section */}
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCredentials(!showCredentials)}
            className="text-xs p-0 h-auto font-normal"
          >
            {showCredentials ? 'Hide' : 'Show'} Authentication
          </Button>

          {showCredentials && (
            <div className="space-y-2 p-3 border rounded-md bg-muted/30">
              <div>
                <label className="text-xs text-muted-foreground">Username/Token</label>
                <Input
                  type="text"
                  placeholder="Username or token"
                  value={credentials.username}
                  onChange={(e) =>
                    setCredentials((prev) => ({ ...prev, username: e.target.value }))
                  }
                  className="text-sm h-8"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Password/Token</label>
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
            </div>
          )}
        </div>
      </div>

      {error && (
        <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertCircle size={16} />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {repository && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle size={16} className="text-green-500" />
              {repository.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {getGitProvider(repository.url)}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {repository.files.length} files
              </Badge>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <Eye size={12} />
                <span>Repository loaded successfully</span>
              </div>
              <div className="flex items-center gap-2">
                <File size={12} />
                <span>Ready for exploration</span>
              </div>
            </div>

            {/* Git Operations */}
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Git Operations
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-xs h-8">
                  📤 Push
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  📥 Pull
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  💾 Commit
                </Button>
                <Button variant="outline" size="sm" className="text-xs h-8">
                  📊 Status
                </Button>
              </div>
            </div>

            {/* Repository Actions */}
            <div className="space-y-2 pt-2 border-t">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Repository
              </h4>
              <div className="space-y-2">
                <Button
                  onClick={handleClear}
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-8 flex items-center gap-2"
                >
                  <GitBranch size={12} />
                  Clone Another Repository
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="text-xs text-muted-foreground space-y-1">
        <p>• Supports GitHub, GitLab, Bitbucket, and self-hosted Git</p>
        <p>• Authentication required for private repositories</p>
        <p>• Use personal access tokens for better security</p>
      </div>
    </div>
  );
}
