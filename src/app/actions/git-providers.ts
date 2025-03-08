'use server';

import db from '@/lib/supabase/db';
import { GitProvider } from '@/types/repositories';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

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

// Helper function to get the current user
async function getCurrentUser() {
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}

/**
 * Test a connection to a git provider
 */
export async function testConnection(data: TestConnectionInput): Promise<{ success: boolean; error?: string; message?: string }> {
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
    console.error('Error in testConnection:', error);
    
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
    
    // We need to implement findUnique in the DB layer for git providers
    const providers = await db.gitProvider.findMany({
      where: { 
        id: id,
        user_id: user.id
      }
    });
    
    if (!providers || providers.length === 0) {
      return { success: false, error: 'Git provider not found' };
    }
    
    return { success: true, data: providers[0] };
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
    
    // Since we don't have a delete method in the DB layer for git providers,
    // we need to use the createClient approach temporarily
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { error } = await supabase
      .from('git_providers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
    
    if (error) {
      console.error('Error deleting git provider:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteGitProvider:', error);
    return { success: false, error: error.message || 'Failed to delete git provider' };
  }
}

export async function addGitProvider(provider: Omit<GitProvider, 'id'>): Promise<GitProvider> {
  // Since we don't have a create method in the DB layer for git providers with the same interface,
  // we need to use the createClient approach temporarily
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  const { data, error } = await supabase
    .from('git_providers')
    .insert([provider])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateGitProvider(id: string, updates: Partial<GitProvider>): Promise<GitProvider> {
  // Since we don't have an update method in the DB layer for git providers with the same interface,
  // we need to use the createClient approach temporarily
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  const { data, error } = await supabase
    .from('git_providers')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function refreshGitProvider(id: string): Promise<GitProvider> {
  // Since we don't have an update method in the DB layer for git providers with this specific use case,
  // we need to use the createClient approach temporarily
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  const { data, error } = await supabase
    .from('git_providers')
    .update({ last_synced: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
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
    
    // Get the provider (using temporary direct database access)
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { data: provider, error: providerError } = await supabase
      .from('git_providers')
      .select('*')
      .eq('id', providerId)
      .eq('user_id', user.id)
      .single();
    
    if (providerError || !provider) {
      return { success: false, error: 'Provider not found or not authorized' };
    }
    
    // Update provider with success status (using temporary direct database access)
    const { error: updateError } = await supabase
      .from('git_providers')
      .update({ 
        status: 'connected',
        last_synced_at: new Date().toISOString()
      })
      .eq('id', providerId);
    
    if (updateError) {
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
    
    // Create the provider (using temporary direct database access)
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    
    const { data: provider, error: createError } = await supabase
      .from('git_providers')
      .insert([{
        type: validatedData.type,
        display_name: validatedData.displayName,
        server_url: validatedData.serverUrl,
        token: validatedData.token,
        user_id: user.id,
        status: validatedData.token ? 'connected' : 'pending'
      }])
      .select()
      .single();
    
    if (createError) {
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