import { NextResponse } from 'next/server';
import { detectProviderFromUrl, extractOwnerFromUrl, extractRepoNameFromUrl } from '@/lib/supabase/db-repositories/utils';

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

    // Detect the provider type from the URL
    const providerType = detectProviderFromUrl(url);
    
    if (!providerType) {
      return NextResponse.json(
        { exists: false, error: 'Unable to determine provider from URL' },
        { status: 400 },
      );
    }
    
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
        // For Gitea, we would need the server URL which we don't have here
        // This is a simplified check that assumes the repository exists
        exists = true;
      } else {
        error = `Unsupported provider type: ${providerType}`;
      }
    } catch (err: any) {
      error = err.message || 'Error checking repository existence';
    }

    return NextResponse.json({ 
      exists, 
      error: exists ? null : error,
      provider: providerType,
      owner,
      name: repoName
    });
  } catch (error: any) {
    console.error('Error verifying repository:', error);
    return NextResponse.json(
      { exists: false, error: error.message || 'Failed to verify repository' },
      { status: 500 },
    );
  }
}
