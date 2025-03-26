import { createClient } from '../server';
import { cookies } from 'next/headers';

// Improved response type format following guidelines
type DbResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Repository file types
export interface RepositoryFile {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: number;
  lastModified: string;
  url?: string;
  download_url?: string;
}

export interface FileContent {
  content: string;
  path: string;
  lastModified: string;
  size?: number;
  url?: string;
  sha?: string;
}

// Repository files DB operations
const files = {
  /**
   * Get files for a repository at a specific path
   */
  async getRepositoryFiles(
    repositoryId: string,
    path: string = '',
    profileId: string,
  ): Promise<DbResponse<RepositoryFile[]>> {
    try {
      console.log('[DB] getRepositoryFiles: Starting for repo', repositoryId, 'path:', path);
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Get the repository details
      const { data: repository, error: repoError } = await supabase
        .from('repositories')
        .select('*')
        .eq('id', repositoryId)
        .single();

      if (repoError || !repository) {
        console.error('[DB] Repository not found:', repoError);
        return { success: false, error: 'Repository not found' };
      }

      // Get the provider details
      const { data: provider, error: providerError } = await supabase
        .from('git_providers')
        .select('*')
        .eq('id', repository.provider_id)
        .single();

      if (providerError || !provider) {
        console.error('[DB] Git provider not found:', providerError);
        return { success: false, error: 'Git provider not found' };
      }

      let files: RepositoryFile[] = [];

      // Handle different Git providers
      if (
        provider.type === 'github' ||
        (provider.type === undefined && repository.owner === 'angelstreet')
      ) {
        // Use GitHub API
        const githubToken = process.env.GITHUB_TOKEN;

        if (!githubToken) {
          return { success: false, error: 'GitHub token is not configured' };
        }

        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({
          auth: githubToken,
        });

        try {
          // If path is empty, we're at the root of the repository
          const response = await octokit.repos.getContent({
            owner: repository.owner,
            repo: repository.name,
            path: path || '',
          });

          // GitHub API returns either an array (directory) or a single object (file)
          const contents = Array.isArray(response.data) ? response.data : [response.data];

          files = contents.map((item: any) => ({
            name: item.name,
            path: item.path,
            type: item.type === 'dir' ? 'folder' : 'file',
            size: item.size,
            lastModified: new Date().toISOString(),
            url: item.html_url || undefined,
            download_url: item.download_url,
          }));
        } catch (error: any) {
          console.error('[DB] Error fetching GitHub repository contents:', error);
          return {
            success: false,
            error: error.message || 'Failed to fetch repository contents',
          };
        }
      } else if (provider.type === 'gitlab') {
        return { success: false, error: 'GitLab API integration not implemented yet' };
      } else if (provider.type === 'gitea') {
        return { success: false, error: 'Gitea API integration not implemented yet' };
      } else {
        // Fallback to mock data for unsupported providers
        files = [
          {
            name: 'README.md',
            path: path ? `${path}/README.md` : 'README.md',
            type: 'file',
            size: 1024,
            lastModified: new Date().toISOString(),
          },
          {
            name: 'src',
            path: path ? `${path}/src` : 'src',
            type: 'folder',
            lastModified: new Date().toISOString(),
          },
          {
            name: 'package.json',
            path: path ? `${path}/package.json` : 'package.json',
            type: 'file',
            size: 512,
            lastModified: new Date().toISOString(),
          },
          {
            name: 'tsconfig.json',
            path: path ? `${path}/tsconfig.json` : 'tsconfig.json',
            type: 'file',
            size: 256,
            lastModified: new Date().toISOString(),
          },
        ];
      }

      return { success: true, data: files };
    } catch (error: any) {
      console.error('[DB] Error in getRepositoryFiles:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch repository files',
      };
    }
  },

  /**
   * Get file content from a repository
   */
  async getFileContent(
    repositoryId: string,
    path: string,
    profileId: string,
  ): Promise<DbResponse<FileContent>> {
    try {
      console.log('[DB] getFileContent: Starting for repo', repositoryId, 'path:', path);
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      if (!path) {
        return { success: false, error: 'File path is required' };
      }

      // Get the repository details
      const { data: repository, error: repoError } = await supabase
        .from('repositories')
        .select('*')
        .eq('id', repositoryId)
        .single();

      if (repoError || !repository) {
        return { success: false, error: 'Repository not found' };
      }

      // Get the provider details
      const { data: provider, error: providerError } = await supabase
        .from('git_providers')
        .select('*')
        .eq('id', repository.provider_id)
        .single();

      if (providerError || !provider) {
        return { success: false, error: 'Git provider not found' };
      }

      let fileContent = '';
      let fileMetadata: {
        path: string;
        lastModified: string;
        size?: number;
        url?: string;
        sha?: string;
      } = {
        path: path,
        lastModified: new Date().toISOString(),
      };

      // Handle different Git providers
      if (
        provider.provider_type === 'github' ||
        (provider.provider_type === undefined && repository.owner === 'angelstreet')
      ) {
        // Use GitHub API
        const githubToken = process.env.GITHUB_TOKEN;

        if (!githubToken) {
          return { success: false, error: 'GitHub token is not configured' };
        }

        const { Octokit } = await import('@octokit/rest');
        const octokit = new Octokit({
          auth: githubToken,
        });

        try {
          // Get file content from GitHub
          const response = await octokit.repos.getContent({
            owner: repository.owner,
            repo: repository.name,
            path: path,
          });

          // GitHub API returns file content in base64
          if ('content' in response.data && !Array.isArray(response.data)) {
            const content = response.data.content;
            const encoding = response.data.encoding;

            if (encoding === 'base64') {
              fileContent = Buffer.from(content, 'base64').toString('utf-8');
            } else {
              fileContent = content;
            }

            fileMetadata = {
              path: response.data.path,
              lastModified: new Date().toISOString(), // Use current date as fallback
              size: response.data.size,
              url: response.data.html_url || undefined,
              sha: response.data.sha,
            };
          } else {
            return { success: false, error: 'Path does not point to a file' };
          }
        } catch (error: any) {
          console.error('[DB] Error fetching file content from GitHub:', error);
          return {
            success: false,
            error: error.message || 'Failed to fetch file content',
          };
        }
      } else if (provider.provider_type === 'gitlab') {
        return { success: false, error: 'GitLab API integration not implemented yet' };
      } else if (provider.provider_type === 'gitea') {
        return { success: false, error: 'Gitea API integration not implemented yet' };
      } else {
        // Fallback to mock content based on file extension
        if (path.endsWith('.md')) {
          fileContent = `# ${repository.name}\n\nThis is a sample README file for the ${repository.name} repository.\n\n## Overview\n\nThis repository contains code for the project.\n\n## Getting Started\n\n1. Clone the repository\n2. Install dependencies\n3. Run the project`;
        } else if (path.endsWith('.json')) {
          const jsonContent = {
            name: repository.name,
            version: '1.0.0',
            description: 'Sample repository',
            main: 'index.js',
            scripts: {
              start: 'node index.js',
              test: 'jest',
            },
            dependencies: {
              react: '^18.2.0',
              next: '^13.4.0',
            },
          };
          fileContent = JSON.stringify(jsonContent, null, 2);
        } else if (path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.tsx')) {
          fileContent = `/**
 * ${path.split('/').pop()}
 * 
 * This is a sample file for demonstration purposes.
 */

import React from 'react';

function Component() {
  return (
    <div>
      <h1>Hello from ${repository.name}</h1>
      <p>This is a sample component</p>
    </div>
  );
}

export default Component;`;
        } else {
          fileContent = `This is a sample content for ${path.split('/').pop()} in the ${repository.name} repository.`;
        }
      }

      const result = {
        content: fileContent,
        ...fileMetadata,
      };

      return { success: true, data: result };
    } catch (error: any) {
      console.error('[DB] Error in getFileContent:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch file content',
      };
    }
  },
};

export default files;
