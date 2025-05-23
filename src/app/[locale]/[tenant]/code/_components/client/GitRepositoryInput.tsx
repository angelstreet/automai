'use client';

import { useState } from 'react';

interface GitRepositoryInputProps {
  onRepositoryClone: (url: string, credentials?: { username: string; password: string }) => void;
  isLoading?: boolean;
}

export function GitRepositoryInput({
  onRepositoryClone,
  isLoading = false,
}: GitRepositoryInputProps) {
  const [repoUrl, setRepoUrl] = useState('');
  const [needsAuth, setNeedsAuth] = useState(false);
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

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

  const handleSubmit = (e: React.FormEvent) => {
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

    console.log('[@component:GitRepositoryInput] Attempting to clone repository:', repoUrl);

    const authCredentials =
      needsAuth && credentials.username && credentials.password ? credentials : undefined;

    onRepositoryClone(repoUrl, authCredentials);
  };

  const exampleUrls = [
    'https://github.com/facebook/react',
    'https://gitlab.com/gitlab-org/gitlab',
    'https://bitbucket.org/atlassian/python-bitbucket',
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Clone Git Repository</h3>
        <p className="text-sm text-gray-600 mb-4">
          Enter any Git repository URL from GitHub, GitLab, Bitbucket, or any Git provider
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="repo-url" className="block text-sm font-medium text-gray-700 mb-1">
            Repository URL
          </label>
          <input
            id="repo-url"
            type="url"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/username/repository"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="needs-auth"
            checked={needsAuth}
            onChange={(e) => setNeedsAuth(e.target.checked)}
            className="mr-2"
            disabled={isLoading}
          />
          <label htmlFor="needs-auth" className="text-sm text-gray-700">
            Private repository (requires authentication)
          </label>
        </div>

        {needsAuth && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={credentials.username}
                onChange={(e) => setCredentials((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="Username"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password/Token
              </label>
              <input
                id="password"
                type="password"
                value={credentials.password}
                onChange={(e) => setCredentials((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Password or Personal Access Token"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {error && <div className="text-red-600 text-sm bg-red-50 p-2 rounded-md">{error}</div>}

        <button
          type="submit"
          disabled={isLoading || !repoUrl.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Cloning Repository...
            </span>
          ) : (
            'Clone Repository'
          )}
        </button>
      </form>

      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Example repositories:</p>
        <div className="space-y-1">
          {exampleUrls.map((url, index) => (
            <button
              key={index}
              onClick={() => setRepoUrl(url)}
              className="block text-sm text-blue-600 hover:text-blue-800 hover:underline"
              disabled={isLoading}
            >
              {url}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
