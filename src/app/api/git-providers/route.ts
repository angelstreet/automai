import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { listGitProviders, createGitProvider } from '@/lib/services/repositories';
import { GitProviderType } from '@/types/repositories';
import { createGithubOauthUrl, createGitlabOauthUrl } from '@/lib/services/oauth';

// Schema validation for creating a git provider
const GitProviderCreateSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea']),
  displayName: z.string().min(2),
  serverUrl: z.string().url().optional(),
  token: z.string().optional(),
});

// GET /api/git-providers
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const providers = await listGitProviders(session.user.id);
    
    return NextResponse.json(providers);
  } catch (error) {
    console.error('Error fetching git providers:', error);
    return NextResponse.json({ error: 'Failed to fetch git providers' }, { status: 500 });
  }
}

// POST /api/git-providers
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    console.log('Received provider data:', JSON.stringify(body));
    
    // Validate request body
    const validation = GitProviderCreateSchema.safeParse(body);
    
    if (!validation.success) {
      console.error('Validation error:', validation.error);
      return NextResponse.json({ error: 'Invalid request body', details: validation.error.format() }, { status: 400 });
    }
    
    const data = validation.data;
    
    try {
      // For Gitea, require a server URL and token
      if (data.type === 'gitea') {
        if (!data.serverUrl || !data.token) {
          return NextResponse.json({ error: 'Server URL and token are required for Gitea' }, { status: 400 });
        }
        
        // Create the Gitea provider
        const provider = await createGitProvider(session.user.id, {
          name: data.type,
          type: data.type,
          displayName: data.displayName,
          serverUrl: data.serverUrl,
          accessToken: data.token,
        });
        
        return NextResponse.json(provider);
      }
      
      // For GitHub and GitLab, generate an OAuth URL
      if (data.type === 'github') {
        // Save the provider without token for now
        const provider = await createGitProvider(session.user.id, {
          name: data.type,
          type: data.type,
          displayName: data.displayName,
        });
        
        const oauthUrl = createGithubOauthUrl(provider.id);
        return NextResponse.json({ id: provider.id, authUrl: oauthUrl });
      }
      
      if (data.type === 'gitlab') {
        // Save the provider without token for now
        const provider = await createGitProvider(session.user.id, {
          name: data.type,
          type: data.type,
          displayName: data.displayName,
        });
        
        const oauthUrl = createGitlabOauthUrl(provider.id);
        return NextResponse.json({ id: provider.id, authUrl: oauthUrl });
      }
      
      return NextResponse.json({ error: 'Unsupported provider type' }, { status: 400 });
    } catch (error) {
      console.error('Error creating git provider:', error);
      if (error instanceof Error) {
        console.error(`Error details: ${error.message}`);
        console.error(`Error stack: ${error.stack}`);
      }
      return NextResponse.json({ error: 'Failed to create git provider', details: error instanceof Error ? error.message : undefined }, { status: 500 });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    if (error instanceof Error) {
      console.error(`Error details: ${error.message}`);
      console.error(`Error stack: ${error.stack}`);
    }
    return NextResponse.json({ error: 'Internal server error', details: error instanceof Error ? error.message : undefined }, { status: 500 });
  }
}
