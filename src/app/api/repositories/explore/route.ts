import { NextRequest, NextResponse } from 'next/server';
import { getRepository, listFiles, getFileContent, listBranches, extractGiteaRepoInfo } from '@/lib/gitea-api';
import { getGitProviderById } from '@/lib/supabase/db-repositories/git-provider';

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
    const action = searchParams.get('action') || 'list'; // 'list', 'file', 'branches'
    
    if (!repositoryId || !providerId) {
      return NextResponse.json(
        { success: false, error: 'Repository ID and Provider ID are required' },
        { status: 400 }
      );
    }
    
    console.log(`[GET /api/repositories/explore] Exploring repository ${repositoryId} with provider ${providerId}`);
    console.log(`[GET /api/repositories/explore] Path: ${path}, Branch: ${branch}, Action: ${action}`);
    
    // Get the Git provider information
    const providerResult = await getGitProviderById(providerId);
    
    if (!providerResult.success || !providerResult.data) {
      return NextResponse.json(
        { success: false, error: 'Git provider not found' },
        { status: 404 }
      );
    }
    
    const provider = providerResult.data;
    
    // Get repository URL from database
    // For this example, we'll use a placeholder. In a real implementation, you'd fetch this from your database
    const repositoryUrl = searchParams.get('repositoryUrl');
    
    if (!repositoryUrl) {
      return NextResponse.json(
        { success: false, error: 'Repository URL is required' },
        { status: 400 }
      );
    }
    
    // Extract owner and repo name from URL
    const { owner, repo } = extractGiteaRepoInfo(repositoryUrl);
    
    // Use the server URL from the provider, or extract it from the repository URL
    const serverUrl = provider.server_url || new URL(repositoryUrl).origin;
    
    // Perform the requested action
    let data;
    
    switch (action) {
      case 'info':
        data = await getRepository(serverUrl, owner, repo, provider.access_token);
        break;
      
      case 'list':
        data = await listFiles(serverUrl, owner, repo, path, branch, provider.access_token);
        break;
      
      case 'file':
        if (!path) {
          return NextResponse.json(
            { success: false, error: 'File path is required' },
            { status: 400 }
          );
        }
        data = await getFileContent(serverUrl, owner, repo, path, branch, provider.access_token);
        break;
      
      case 'branches':
        data = await listBranches(serverUrl, owner, repo, provider.access_token);
        break;
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
    
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[GET /api/repositories/explore] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
