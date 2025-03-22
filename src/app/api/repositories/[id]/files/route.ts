import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Octokit } from '@octokit/rest';
import { getUser } from '@/app/actions/user';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Ensure params is awaited before using its properties
    const resolvedParams = await Promise.resolve(params);
    const repositoryId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    
    if (!repositoryId) {
      return NextResponse.json(
        { success: false, error: 'Repository ID is required' },
        { status: 400 },
      );
    }
    
    // Get the current user using the centralized getUser action
    const user = await getUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }
    
    // Create Supabase client for DB operations only
    const supabase = await createClient();
    
    // Get the repository details
    const { data: repository, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', repositoryId)
      .single();
    
    if (repoError || !repository) {
      return NextResponse.json(
        { success: false, error: 'Repository not found' },
        { status: 404 },
      );
    }
    
    // Get the provider details to determine which API to use
    const { data: provider, error: providerError } = await supabase
      .from('git_providers')
      .select('*')
      .eq('id', repository.provider_id)
      .single();
    
    if (providerError || !provider) {
      return NextResponse.json(
        { success: false, error: 'Git provider not found' },
        { status: 404 },
      );
    }
    
    // Debug logs
    console.log('Provider type:', provider.type);
    console.log('Repository owner:', repository.owner);
    console.log('Repository name:', repository.name);
    
    let files = [];
    
    // Handle different Git providers
    if (provider.type === 'github' || 
        (provider.type === undefined && repository.owner === 'angelstreet')) {
      // Use GitHub API - fallback for undefined provider type for angelstreet repos
      const githubToken = process.env.GITHUB_TOKEN;
      
      // Debug the token (don't log the actual token value for security)
      console.log('GitHub token type:', typeof githubToken);
      console.log('GitHub token length:', githubToken ? githubToken.length : 0);
      
      if (!githubToken) {
        return NextResponse.json(
          { success: false, error: 'GitHub token is not configured' },
          { status: 500 },
        );
      }
      
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
        console.error('Error fetching GitHub repository contents:', error);
        return NextResponse.json(
          { success: false, error: error.message || 'Failed to fetch repository contents' },
          { status: 500 },
        );
      }
    } else if (provider.type === 'gitlab') {
      // Use GitLab API (to be implemented)
      return NextResponse.json(
        { success: false, error: 'GitLab API integration not implemented yet' },
        { status: 501 },
      );
    } else if (provider.type === 'gitea') {
      // Use Gitea API (to be implemented)
      return NextResponse.json(
        { success: false, error: 'Gitea API integration not implemented yet' },
        { status: 501 },
      );
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
    
    return NextResponse.json({ success: true, data: files });
  } catch (error: any) {
    console.error('Error fetching repository files:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch repository files' },
      { status: 500 },
    );
  }
}
