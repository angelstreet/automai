// ARCHIVED: This API route was archived on 2025-03-31T09:42:38.762Z
// Original path: src/app/api/repositories/verify/route.ts
// Route: /repositories/verify
// This file is preserved for reference purposes only and is no longer in use.

import { NextResponse } from 'next/server';

import {
  detectProviderFromUrl,
  extractOwnerFromUrl,
  extractRepoNameFromUrl,
  isValidGitUrl,
} from '@/lib/supabase/db-repositories/utils';

/**
 * Verify if a repository exists by checking the provider's API
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { exists: false, error: 'Repository URL is required' },
        { status: 400 },
      );
    }

    // Validate that the URL is a Git repository URL
    if (!isValidGitUrl(url)) {
      return NextResponse.json(
        { exists: false, error: 'Invalid Git repository URL. URL must contain .git extension.' },
        { status: 400 },
      );
    }

    // Detect the provider type from the URL
    const providerType = detectProviderFromUrl(url);

    // Extract repository name and owner from URL
    const repoName = extractRepoNameFromUrl(url);
    const owner = extractOwnerFromUrl(url);

    if (!repoName || !owner) {
      return NextResponse.json(
        { exists: false, error: 'Unable to extract repository details from URL' },
        { status: 400 },
      );
    }

    // Check if the repository exists based on the provider type
    let exists = false;
    let error = null;

    try {
      if (providerType === 'github') {
        // Check GitHub API
        const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}`);
        exists = response.status === 200;

        if (!exists) {
          const errorData = await response.json();
          error = errorData.message || 'Repository not found on GitHub';
        }
      } else if (providerType === 'gitlab') {
        // Check GitLab API
        const encodedPath = encodeURIComponent(`${owner}/${repoName}`);
        const response = await fetch(`https://gitlab.com/api/v4/projects/${encodedPath}`);
        exists = response.status === 200;

        if (!exists) {
          const errorData = await response.json();
          error = errorData.message || 'Repository not found on GitLab';
        }
      } else if (providerType === 'gitea') {
        // For Gitea, we'll assume it exists if we can parse the URL
        // This is a simplification as we'd need the specific Gitea instance URL to check
        exists = true;
      } else if (providerType === 'self-hosted') {
        // For self-hosted, we'll assume it exists if the URL is valid
        // The actual cloning process will verify if it's accessible
        exists = true;
      }
    } catch (apiError: any) {
      error = apiError.message || 'Error checking repository existence';
      console.error('API error when verifying repository:', apiError);
    }

    return NextResponse.json({
      exists,
      provider: providerType,
      owner,
      repo: repoName,
      error: error || undefined,
    });
  } catch (error: any) {
    console.error('Error verifying repository:', error);
    return NextResponse.json(
      { exists: false, error: error.message || 'Failed to verify repository' },
      { status: 500 },
    );
  }
}
