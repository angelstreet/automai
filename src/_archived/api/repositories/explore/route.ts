// ARCHIVED: This API route was archived on 2025-03-31T09:42:38.759Z
// Original path: src/app/api/repositories/explore/route.ts
// Route: /repositories/explore
// This file is preserved for reference purposes only and is no longer in use.

import { NextRequest, NextResponse } from 'next/server';

import {
  getRepository as getGiteaRepository,
  listFiles as listGiteaFiles,
  getFileContent as getGiteaFileContent,
  listBranches as listGiteaBranches,
  extractGiteaRepoInfo,
} from '@/lib/gitea-api';
import {
  getRepository as getGitHubRepository,
  listFiles as listGitHubFiles,
  getFileContent as getGitHubFileContent,
  listBranches as listGitHubBranches,
  extractGitHubRepoInfo,
} from '@/lib/github-api';
import {
  getRepository as getGitLabRepository,
  listFiles as listGitLabFiles,
  getFileContent as getGitLabFileContent,
  listBranches as listGitLabBranches,
  extractGitLabProjectId,
} from '@/lib/gitlab-api';
import { getGitProvider } from '@/app/actions/repositories';

/**
 * GET /api/repositories/explore
 * Explore a repository's contents
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const repositoryId = searchParams.get('repositoryId');
    const providerId = searchParams.get('providerId');
    const path = searchParams.get('path') || '';
    const branch = searchParams.get('branch') || '';
    const action = searchParams.get('action') || 'list'; // 'list', 'file', 'branches', 'info'

    if (!repositoryId || !providerId) {
      return NextResponse.json(
        { success: false, error: 'Repository ID and Provider ID are required' },
        { status: 400 },
      );
    }

    console.log(
      `[GET /api/repositories/explore] Exploring repository ${repositoryId} with provider ${providerId}`,
    );
    console.log(
      `[GET /api/repositories/explore] Path: ${path}, Branch: ${branch}, Action: ${action}`,
    );

    // Get the Git provider information
    const providerResult = await getGitProvider(providerId);

    if (!providerResult.success || !providerResult.data) {
      return NextResponse.json(
        { success: false, error: 'Git provider not found' },
        { status: 404 },
      );
    }

    const provider = providerResult.data;

    // Get repository URL from query params
    const repositoryUrl = searchParams.get('repositoryUrl');

    if (!repositoryUrl) {
      return NextResponse.json(
        { success: false, error: 'Repository URL is required' },
        { status: 400 },
      );
    }

    // Use the server URL from the provider, or extract it from the repository URL
    const serverUrl =
      provider.server_url ||
      (provider.type === 'gitlab' ? 'https://gitlab.com' : new URL(repositoryUrl).origin);

    // Perform the requested action based on provider type
    let data;

    if (provider.type === 'gitlab') {
      // GitLab API
      const projectId = extractGitLabProjectId(repositoryUrl);
      console.log(`[GET /api/repositories/explore] GitLab Project ID: ${projectId}`);

      try {
        switch (action) {
          case 'info':
            data = await getGitLabRepository(serverUrl, projectId, provider.access_token);
            break;

          case 'list':
            data = await listGitLabFiles(serverUrl, projectId, path, branch, provider.access_token);

            // Transform GitLab response to match the expected format
            data = data.map((item: any) => ({
              name: item.name,
              path: item.path,
              type: item.type === 'tree' ? 'dir' : 'file',
              size: item.size || 0,
              url: item.web_url,
            }));
            break;

          case 'file':
            if (!path) {
              return NextResponse.json(
                { success: false, error: 'File path is required' },
                { status: 400 },
              );
            }
            data = await getGitLabFileContent(
              serverUrl,
              projectId,
              path,
              branch,
              provider.access_token,
            );
            break;

          case 'branches':
            data = await listGitLabBranches(serverUrl, projectId, provider.access_token);
            break;

          default:
            return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }
      } catch (error) {
        console.error(`[GET /api/repositories/explore] Error with token: ${error}`);

        // If authentication fails, try without token for public repositories
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          console.log('[GET /api/repositories/explore] Trying without token for public repository');

          try {
            switch (action) {
              case 'info':
                data = await getGitLabRepository(serverUrl, projectId);
                break;

              case 'list':
                data = await listGitLabFiles(serverUrl, projectId, path, branch);

                // Transform GitLab response to match the expected format
                data = data.map((item: any) => ({
                  name: item.name,
                  path: item.path,
                  type: item.type === 'tree' ? 'dir' : 'file',
                  size: item.size || 0,
                  url: item.web_url,
                }));
                break;

              case 'file':
                if (!path) {
                  return NextResponse.json(
                    { success: false, error: 'File path is required' },
                    { status: 400 },
                  );
                }
                data = await getGitLabFileContent(serverUrl, projectId, path, branch);
                break;

              case 'branches':
                data = await listGitLabBranches(serverUrl, projectId);
                break;

              default:
                return NextResponse.json(
                  { success: false, error: 'Invalid action' },
                  { status: 400 },
                );
            }
          } catch (publicError) {
            console.error(`[GET /api/repositories/explore] Error without token: ${publicError}`);
            throw new Error(
              'Repository access failed. This may be a private repository that requires valid credentials.',
            );
          }
        } else {
          throw error;
        }
      }
    } else if (provider.type === 'github') {
      // GitHub API
      const { owner, repo } = extractGitHubRepoInfo(repositoryUrl);
      console.log(`[GET /api/repositories/explore] GitHub Owner/Repo: ${owner}/${repo}`);

      try {
        switch (action) {
          case 'info':
            data = await getGitHubRepository(owner, repo, provider.access_token);
            break;

          case 'list':
            data = await listGitHubFiles(owner, repo, path, branch, provider.access_token);

            // If the response is a single file (not an array), wrap it in an array
            if (!Array.isArray(data)) {
              data = [data];
            }

            // Transform GitHub response to match the expected format
            data = data.map((item: any) => ({
              name: item.name,
              path: item.path,
              type: item.type === 'dir' ? 'dir' : 'file',
              size: item.size || 0,
              url: item.html_url,
              sha: item.sha,
              download_url: item.download_url,
            }));
            break;

          case 'file':
            if (!path) {
              return NextResponse.json(
                { success: false, error: 'File path is required' },
                { status: 400 },
              );
            }
            data = await getGitHubFileContent(owner, repo, path, branch, provider.access_token);
            break;

          case 'branches':
            data = await listGitHubBranches(owner, repo, provider.access_token);
            break;

          default:
            return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }
      } catch (error) {
        console.error(`[GET /api/repositories/explore] Error with token: ${error}`);

        // If authentication fails, try without token for public repositories
        if (
          error instanceof Error &&
          (error.message.includes('Unauthorized') || error.message.includes('Not Found'))
        ) {
          console.log('[GET /api/repositories/explore] Trying without token for public repository');

          try {
            switch (action) {
              case 'info':
                data = await getGitHubRepository(owner, repo);
                break;

              case 'list':
                data = await listGitHubFiles(owner, repo, path, branch);

                // If the response is a single file (not an array), wrap it in an array
                if (!Array.isArray(data)) {
                  data = [data];
                }

                // Transform GitHub response to match the expected format
                data = data.map((item: any) => ({
                  name: item.name,
                  path: item.path,
                  type: item.type === 'dir' ? 'dir' : 'file',
                  size: item.size || 0,
                  url: item.html_url,
                  sha: item.sha,
                  download_url: item.download_url,
                }));
                break;

              case 'file':
                if (!path) {
                  return NextResponse.json(
                    { success: false, error: 'File path is required' },
                    { status: 400 },
                  );
                }
                data = await getGitHubFileContent(owner, repo, path, branch);
                break;

              case 'branches':
                data = await listGitHubBranches(owner, repo);
                break;

              default:
                return NextResponse.json(
                  { success: false, error: 'Invalid action' },
                  { status: 400 },
                );
            }
          } catch (publicError) {
            console.error(`[GET /api/repositories/explore] Error without token: ${publicError}`);
            throw new Error(
              'Repository access failed. This may be a private repository that requires valid credentials.',
            );
          }
        } else {
          throw error;
        }
      }
    } else if (provider.type === 'gitea' || provider.type === 'self-hosted') {
      // Gitea API (also works for self-hosted providers)
      const { owner, repo } = extractGiteaRepoInfo(repositoryUrl);
      console.log(`[GET /api/repositories/explore] Gitea Owner/Repo: ${owner}/${repo}`);

      try {
        switch (action) {
          case 'info':
            data = await getGiteaRepository(serverUrl, owner, repo, provider.access_token);
            break;

          case 'list':
            data = await listGiteaFiles(
              serverUrl,
              owner,
              repo,
              path,
              branch,
              provider.access_token,
            );
            break;

          case 'file':
            if (!path) {
              return NextResponse.json(
                { success: false, error: 'File path is required' },
                { status: 400 },
              );
            }
            data = await getGiteaFileContent(
              serverUrl,
              owner,
              repo,
              path,
              branch,
              provider.access_token,
            );
            break;

          case 'branches':
            data = await listGiteaBranches(serverUrl, owner, repo, provider.access_token);
            break;

          default:
            return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
        }
      } catch (error) {
        console.error(`[GET /api/repositories/explore] Error with token: ${error}`);

        // If authentication fails, try without token for public repositories
        if (error instanceof Error && error.message.includes('Unauthorized')) {
          console.log('[GET /api/repositories/explore] Trying without token for public repository');

          try {
            switch (action) {
              case 'info':
                data = await getGiteaRepository(serverUrl, owner, repo);
                break;

              case 'list':
                data = await listGiteaFiles(serverUrl, owner, repo, path, branch);
                break;

              case 'file':
                if (!path) {
                  return NextResponse.json(
                    { success: false, error: 'File path is required' },
                    { status: 400 },
                  );
                }
                data = await getGiteaFileContent(serverUrl, owner, repo, path, branch);
                break;

              case 'branches':
                data = await listGiteaBranches(serverUrl, owner, repo);
                break;

              default:
                return NextResponse.json(
                  { success: false, error: 'Invalid action' },
                  { status: 400 },
                );
            }
          } catch (publicError) {
            console.error(`[GET /api/repositories/explore] Error without token: ${publicError}`);
            throw new Error(
              'Repository access failed. This may be a private repository that requires valid credentials.',
            );
          }
        } else {
          throw error;
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: `Unsupported provider type: ${provider.type}` },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[GET /api/repositories/explore] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
