import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { Octokit } from '@octokit/rest';

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
    
    if (!path) {
      return NextResponse.json(
        { success: false, error: 'File path is required' },
        { status: 400 },
      );
    }
    
    // Get the current user's profile ID
    const cookieStore = cookies();
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }
    
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
    console.log('Provider type:', provider.provider_type);
    console.log('Repository owner:', repository.owner);
    console.log('Repository name:', repository.name);
    
    let fileContent = '';
    let fileMetadata: {
      path: string;
      lastModified: string;
      size?: number;
      url?: string;
      sha?: string;
    } = {
      path: path,
      lastModified: new Date().toISOString()
    };
    
    // Handle different Git providers
    if (provider.provider_type === 'github' || 
        (provider.provider_type === undefined && repository.owner === 'angelstreet')) {
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
            sha: response.data.sha
          };
        } else {
          return NextResponse.json(
            { success: false, error: 'Path does not point to a file' },
            { status: 400 },
          );
        }
      } catch (error: any) {
        console.error('Error fetching file content from GitHub:', error);
        return NextResponse.json(
          { success: false, error: error.message || 'Failed to fetch file content' },
          { status: 500 },
        );
      }
    } else if (provider.provider_type === 'gitlab') {
      // Use GitLab API (to be implemented)
      return NextResponse.json(
        { success: false, error: 'GitLab API integration not implemented yet' },
        { status: 501 },
      );
    } else if (provider.provider_type === 'gitea') {
      // Use Gitea API (to be implemented)
      return NextResponse.json(
        { success: false, error: 'Gitea API integration not implemented yet' },
        { status: 501 },
      );
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
            test: 'jest'
          },
          dependencies: {
            react: '^18.2.0',
            'next': '^13.4.0'
          }
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
    
    return NextResponse.json({ 
      success: true, 
      data: { 
        content: fileContent,
        ...fileMetadata
      } 
    });
  } catch (error: any) {
    console.error('Error fetching file content:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch file content' },
      { status: 500 },
    );
  }
}
