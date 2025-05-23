'use client';

import { useState } from 'react';

interface Repository {
  url: string;
  name: string;
  files: any[];
}

interface GitPanelProps {
  repository: Repository | null;
  onRepositoryClone: (url: string, credentials?: { username: string; password: string }) => void;
  isLoading: boolean;
  error?: string | null;
}

export function GitPanel({
  repository,
  onRepositoryClone,
  isLoading,
  error: externalError,
}: GitPanelProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [needsAuth, setNeedsAuth] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  // Use external error if provided, otherwise use local error
  const displayError = externalError || error;

  const isValidGitUrl = (url: string): boolean => {
    const gitUrlPatterns = [
      /^https:\/\/github\.com\/[\w-]+\/[\w.-]+(?:\.git)?$/,
      /^https:\/\/gitlab\.com\/[\w-]+\/[\w.-]+(?:\.git)?$/,
      /^https:\/\/bitbucket\.org\/[\w-]+\/[\w.-]+(?:\.git)?$/,
      /^https:\/\/.*\.git$/,
      /^git@.*:.*\.git$/,
    ];
    return gitUrlPatterns.some((pattern) => pattern.test(url));
  };

  const handleClone = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!repoUrl.trim()) {
      setError('Please enter a repository URL');
      return;
    }

    if (!isValidGitUrl(repoUrl)) {
      setError('Please enter a valid Git repository URL');
      return;
    }

    const authCredentials =
      needsAuth && credentials.username && credentials.password ? credentials : undefined;

    onRepositoryClone(repoUrl, authCredentials);
  };

  const quickCloneOptions = [
    {
      name: 'Automai (This Project)',
      url: 'https://github.com/angelstreet/automai.git',
      description: 'Automai SaaS - Infrastructure automation platform',
    },
    {
      name: 'React',
      url: 'https://github.com/facebook/react',
      description: 'A declarative JavaScript library for building user interfaces',
    },
    {
      name: 'Vue.js',
      url: 'https://github.com/vuejs/vue',
      description: 'The progressive JavaScript framework',
    },
    {
      name: 'Next.js',
      url: 'https://github.com/vercel/next.js',
      description: 'The React framework for production',
    },
  ];

  if (repository) {
    return (
      <div className="p-4 space-y-4">
        {/* Current Repository */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">Current Repository</h3>
          <div className="bg-gray-800 p-3 rounded">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-xs">📦</span>
              <span className="text-sm font-medium">{repository.name}</span>
            </div>
            <div className="text-xs text-gray-400 mb-3" title={repository.url}>
              {repository.url}
            </div>
            <div className="text-xs text-green-400">✓ Repository cloned successfully</div>
          </div>
        </div>

        {/* Git Actions */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-300">Source Control</h3>
          <div className="space-y-2">
            <button className="w-full bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm text-left flex items-center space-x-2">
              <span>🔄</span>
              <span>Pull changes</span>
            </button>
            <button className="w-full bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm text-left flex items-center space-x-2">
              <span>📤</span>
              <span>Push changes</span>
            </button>
            <button className="w-full bg-gray-700 hover:bg-gray-600 p-2 rounded text-sm text-left flex items-center space-x-2">
              <span>🌿</span>
              <span>Create branch</span>
            </button>
          </div>
        </div>

        {/* Clone New Repository */}
        <div className="pt-3 border-t border-gray-600">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 hover:bg-blue-700 p-2 rounded text-sm flex items-center justify-center space-x-2"
          >
            <span>📁</span>
            <span>Clone Different Repository</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Clone Repository Form */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Clone Repository</h3>

        <form onSubmit={handleClone} className="space-y-3">
          <div>
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Repository URL (https://github.com/user/repo)"
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="git-needs-auth"
              checked={needsAuth}
              onChange={(e) => setNeedsAuth(e.target.checked)}
              className="rounded"
              disabled={isLoading}
            />
            <label htmlFor="git-needs-auth" className="text-xs text-gray-400">
              Private repository
            </label>
          </div>

          {needsAuth && (
            <div className="space-y-2">
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Username"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                disabled={isLoading}
              />
              <input
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Password/Token"
                className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                disabled={isLoading}
              />
            </div>
          )}

          {displayError && (
            <div className="text-red-400 text-xs bg-red-900/20 p-2 rounded">{displayError}</div>
          )}

          <button
            type="submit"
            disabled={isLoading || !repoUrl.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed p-2 rounded text-sm flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                <span>Cloning...</span>
              </>
            ) : (
              <>
                <span>📥</span>
                <span>Clone Repository</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Quick Clone Options */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-300">Quick Clone</h3>
        <div className="space-y-2">
          {quickCloneOptions.map((option) => (
            <button
              key={option.url}
              onClick={() => setRepoUrl(option.url)}
              disabled={isLoading}
              className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed p-3 rounded text-left border border-gray-600"
            >
              <div className="text-sm font-medium text-white mb-1">{option.name}</div>
              <div className="text-xs text-gray-400 mb-2">{option.description}</div>
              <div className="text-xs text-blue-400 font-mono">{option.url}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Supported Providers */}
      <div className="pt-3 border-t border-gray-600">
        <div className="text-xs text-gray-400 text-center">
          <div className="mb-2">Supported Git providers:</div>
          <div className="flex justify-center space-x-4">
            <span>GitHub</span>
            <span>GitLab</span>
            <span>Bitbucket</span>
          </div>
        </div>
      </div>
    </div>
  );
}
