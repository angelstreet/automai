'use server';

import db from '@/lib/supabase/db';
import { GitProvider } from '@/types/repositories';
import { z } from 'zod';
import { getCurrentUser } from '@/app/actions/user';

// Schema for testing a connection
const testConnectionSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea'] as const, {
    required_error: 'Provider type is required',
  }),
  serverUrl: z.string().url('Invalid URL').optional(),
  token: z.string({
    required_error: 'Access token is required',
  }),
});

type TestConnectionInput = z.infer<typeof testConnectionSchema>;

// Schema for creating a git provider
const gitProviderCreateSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea']),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  serverUrl: z.string().url('Invalid URL').optional(),
  token: z.string().optional(),
});

type GitProviderCreateInput = z.infer<typeof gitProviderCreateSchema>;

/**
 * Test a connection to a git provider
 */
export async function testGitProviderConnection(data: TestConnectionInput): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    // Validate input data
    const validatedData = testConnectionSchema.parse(data);
    
    // Test connection with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const baseUrl =
      validatedData.type === 'gitea'
        ? validatedData.serverUrl
        : validatedData.type === 'github'
          ? 'https://api.github.com'
          : 'https://gitlab.com/api/v4';

    const response = await fetch(`${baseUrl}/api/v1/user`, {
      headers: {
        Authorization: `token ${validatedData.token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Handle response
    if (!response.ok) {
      return {
        success: false,
        error: 'Connection to git provider failed'
      };
    }

    return {
      success: true,
      message: 'Connection test successful'
    };
  } catch (error: any) {
    console.error('Error in testGitProviderConnection:', error);
    
    // Handle specific errors
    if (error instanceof Error) {
      return {
        success: false,
        error: error.name === 'AbortError' ? 'Connection timeout after 5s' : error.message
      };
    }
    
    return {
      success: false,
      error: error.message || 'Connection to git provider failed'
    };
  }
}

/**
 * List all git providers for the current user
 */
export async function getGitProviders(): Promise<{ success: boolean; error?: string; data?: any[] }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] };
    }
    
    const data = await db.gitProvider.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' }
    });
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in getGitProviders:', error);
    return { success: false, error: error.message || 'Failed to fetch git providers' };
  }
}

/**
 * Get a git provider by ID
 */
export async function getGitProvider(id: string): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: null };
    }
    
    const data = await db.gitProvider.findUnique({
      where: { 
        id,
        user_id: user.id
      }
    });
    
    if (!data) {
      return { success: false, error: 'Git provider not found' };
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error in getGitProvider:', error);
    return { success: false, error: error.message || 'Failed to fetch git provider' };
  }
}

/**
 * Delete a git provider by ID
 */
export async function deleteGitProvider(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    try {
      await db.gitProvider.delete({
        where: {
          id,
          user_id: user.id
        }
      });
      
      return { success: true };
    } catch (error: any) {
      console.error('Error deleting git provider:', error);
      return { success: false, error: error.message };
    }
  } catch (error: any) {
    console.error('Error in deleteGitProvider:', error);
    return { success: false, error: error.message || 'Failed to delete git provider' };
  }
}

export async function addGitProvider(provider: Omit<GitProvider, 'id'>): Promise<GitProvider> {
  try {
    const result = await db.gitProvider.create({
      data: provider
    });
    
    return result;
  } catch (error) {
    console.error('Error in addGitProvider:', error);
    throw error;
  }
}

export async function updateGitProvider(id: string, updates: Partial<GitProvider>): Promise<GitProvider> {
  try {
    const result = await db.gitProvider.update({
      where: { id },
      data: updates
    });
    
    return result;
  } catch (error) {
    console.error('Error in updateGitProvider:', error);
    throw error;
  }
}

export async function refreshGitProvider(id: string): Promise<GitProvider> {
  try {
    const result = await db.gitProvider.update({
      where: { id },
      data: { last_synced: new Date().toISOString() }
    });
    
    return result;
  } catch (error) {
    console.error('Error in refreshGitProvider:', error);
    throw error;
  }
}

/**
 * Handle OAuth callback for git providers
 */
export async function handleOAuthCallback(code: string, state: string): Promise<{ success: boolean; error?: string; redirectUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Parse the state parameter
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch (e) {
      return { success: false, error: 'Invalid state parameter' };
    }
    
    const { providerId, redirectUri } = stateData;
    
    // Get the provider
    const provider = await db.gitProvider.findUnique({
      where: {
        id: providerId,
        user_id: user.id
      }
    });
    
    if (!provider) {
      return { success: false, error: 'Provider not found or not authorized' };
    }
    
    // Update provider with success status
    try {
      await db.gitProvider.update({
        where: { id: providerId },
        data: { 
          status: 'connected',
          last_synced_at: new Date().toISOString()
        }
      });
    } catch (updateError) {
      return { success: false, error: 'Failed to update provider' };
    }
    
    // Return success with redirect URL
    return { 
      success: true, 
      redirectUrl: `/repositories?provider=${providerId}`
    };
  } catch (error: any) {
    console.error('Error in handleOAuthCallback:', error);
    return { success: false, error: error.message || 'Failed to process OAuth callback' };
  }
}

/**
 * Create a new git provider
 */
export async function createGitProvider(data: GitProviderCreateInput): Promise<{ success: boolean; error?: string; data?: any; authUrl?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Validate input data
    const validatedData = gitProviderCreateSchema.parse(data);
    
    // Create the provider
    let provider;
    try {
      provider = await db.gitProvider.create({
        data: {
          type: validatedData.type,
          display_name: validatedData.displayName,
          server_url: validatedData.serverUrl,
          token: validatedData.token,
          user_id: user.id,
          status: validatedData.token ? 'connected' : 'pending'
        }
      });
    } catch (createError: any) {
      console.error('Error creating git provider:', createError);
      return { success: false, error: createError.message };
    }
    
    // If token is provided, we're done
    if (validatedData.token) {
      return { success: true, data: provider };
    }
    
    // Otherwise, generate OAuth URL based on provider type
    let authUrl = '';
    const stateData = {
      providerId: provider.id,
      redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/git-providers/callback`
    };
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64');
    
    if (validatedData.type === 'github') {
      const clientId = process.env.GITHUB_CLIENT_ID;
      authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo&state=${state}`;
    } else if (validatedData.type === 'gitlab') {
      const clientId = process.env.GITLAB_CLIENT_ID;
      authUrl = `https://gitlab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(stateData.redirectUri)}&response_type=code&state=${state}&scope=api`;
    } else {
      return { success: false, error: 'Unsupported provider type for OAuth' };
    }
    
    return { success: true, data: provider, authUrl };
  } catch (error: any) {
    console.error('Error in createGitProvider:', error);
    
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    
    return { success: false, error: error.message || 'Failed to create git provider' };
  }
} 