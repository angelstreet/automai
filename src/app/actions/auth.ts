'use server';

import { supabaseAuth } from '@/lib/supabase/auth';

import { invalidateUserCache } from './user';

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: 'google' | 'github', redirectUrl: string) {
  try {
    // Use standard OAuth flow
    const result = await supabaseAuth.signInWithOAuth(provider, {
      redirectTo: redirectUrl,
    });

    // Add debug log
    if (result.success && result.data?.url) {
      console.log('🔐 OAUTH: Successfully initiated OAuth flow');
    }

    return {
      success: result.success,
      error: result.error || null,
      data: result.data || null,
    };
  } catch (error: any) {
    console.error('Error signing in with OAuth:', error);
    return { success: false, error: error.message || 'Failed to sign in', data: null };
  }
}

/**
 * Handle OAuth callback from Supabase Auth
 */
export async function handleAuthCallback(urlOrCode: string) {
  try {
    // If this is a URL, extract the code
    let code = urlOrCode;
    if (urlOrCode.startsWith('http')) {
      const url = new URL(urlOrCode);
      const codeParam = url.searchParams.get('code');
      if (codeParam) {
        code = codeParam;
        console.log('⭐ AUTH CALLBACK - Extracted code from URL:', code.substring(0, 6) + '...');
      } else {
        console.error('⭐ AUTH CALLBACK ERROR - No code provided in URL');
        throw new Error('No code provided in URL');
      }
    } else {
      console.log('⭐ AUTH CALLBACK - Using provided code:', code.substring(0, 6) + '...');
    }

    // Invalidate user cache before processing callback
    await invalidateUserCache();
    console.log('⭐ AUTH CALLBACK - User cache invalidated');

    // Exchange the code for a session
    console.log('⭐ AUTH CALLBACK - Exchanging code for session');
    const result = await supabaseAuth.handleOAuthCallback(code);

    if (!result.success) {
      console.error('⭐ AUTH CALLBACK ERROR - Authentication failed:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to authenticate',
        redirectUrl: '/login?error=Authentication+failed',
      };
    }

    return handleAuthSuccess(result, urlOrCode);
  } catch (error: any) {
    console.error('⭐ AUTH CALLBACK ERROR - Exception:', error);
    return {
      success: false,
      error: error.message || 'Authentication failed',
      redirectUrl: '/login?error=Authentication+failed',
    };
  }
}

/**
 * Handle successful authentication and prepare redirect
 */
function handleAuthSuccess(result: any, url: string) {
  console.log('⭐ AUTH CALLBACK SUCCESS - Session obtained');

  // Log session details for debugging
  const session = result.data.session;
  console.log('⭐ AUTH CALLBACK - Session present:', !!session);

  if (session) {
    console.log(
      '⭐ AUTH CALLBACK - Session expires at:',
      new Date(session.expires_at * 1000).toISOString(),
    );
    console.log('⭐ AUTH CALLBACK - User ID:', session.user.id);
    console.log('⭐ AUTH CALLBACK - User email:', session.user.email);
  }

  // Get the tenant information for redirection
  const userData = result.data.session?.user;

  // Use tenant_name or default to 'trial'
  const tenantName = userData?.user_metadata?.tenant_name || 'trial';

  // Get the locale from URL or default to 'en'
  // Try to extract locale from the URL path
  const pathParts = url.split('/');
  const localeIndex = pathParts.findIndex((part) => part === 'auth-redirect') - 1;

  // If we're at the root URL (which happens on Vercel), use the default locale
  // or try to extract from user preferences if available
  let locale = 'en';

  // First check if we can extract it from the URL path
  if (localeIndex >= 0) {
    locale = pathParts[localeIndex];
  }
  // For root URL authentication on Vercel, use tenant locale if available
  else if (userData?.user_metadata?.locale) {
    locale = userData.user_metadata.locale;
  }

  console.log('⭐ AUTH CALLBACK - Using locale:', locale);

  // Log for debugging
  console.log('⭐ AUTH CALLBACK - Redirect using tenant:', tenantName);

  // Redirect URL for after authentication
  const redirectUrl = `/${locale}/${tenantName}/dashboard`;

  return {
    success: true,
    redirectUrl,
  };
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, name: string, redirectUrl: string) {
  try {
    // Invalidate user cache before sign up
    await invalidateUserCache();

    const result = await supabaseAuth.signUp(email, password, {
      redirectTo: redirectUrl,
      data: { name },
    });

    return {
      success: result.success,
      error: result.error || null,
      data: result.data || null,
    };
  } catch (error: any) {
    console.error('Error signing up:', error);
    return { success: false, error: error.message || 'Failed to sign up', data: null };
  }
}

/**
 * Sign in with password
 */
export async function signInWithPassword(email: string, password: string) {
  try {
    // Invalidate user cache before sign in
    await invalidateUserCache();

    const result = await supabaseAuth.signInWithPassword(email, password);

    return {
      success: result.success,
      error: result.error || null,
      data: result.data || null,
    };
  } catch (error: any) {
    // Don't log Auth session missing errors as they're expected during login
    if (error.message !== 'Auth session missing!') {
      console.error('Error signing in with password:', error);
    }
    return { success: false, error: error.message || 'Failed to sign in', data: null };
  }
}

/**
 * Update user password
 */
export async function updatePassword(password: string) {
  try {
    // Invalidate user cache before updating password
    await invalidateUserCache();

    const result = await supabaseAuth.updatePassword(password);

    return {
      success: result.success,
      error: result.error || null,
    };
  } catch (error: any) {
    console.error('Error updating password:', error);
    return { success: false, error: error.message || 'Failed to update password' };
  }
}

/**
 * Reset password for email
 */
export async function resetPasswordForEmail(email: string, redirectUrl: string) {
  try {
    const result = await supabaseAuth.resetPasswordForEmail(email, redirectUrl);

    return {
      success: result.success,
      error: result.error || null,
    };
  } catch (error: any) {
    console.error('Error resetting password:', error);
    return { success: false, error: error.message || 'Failed to reset password' };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(formData: FormData) {
  try {
    // Get locale from form data for redirect
    const locale = (formData.get('locale') as string) || 'en';

    // Invalidate user cache on sign out
    await invalidateUserCache();

    const result = await supabaseAuth.signOut();

    if (!result.success) {
      console.error('Error signing out:', result.error);
      throw new Error(result.error || 'Failed to sign out');
    }

    // Return success and redirect URL
    return {
      success: true,
      redirectUrl: `/${locale}/login`,
    };
  } catch (error) {
    console.error('Error signing out:', error);
    throw new Error('Failed to sign out');
  }
}

/**
 * Exchange code for session - simplified function for client components
 */
export async function exchangeCodeForSession(url: string) {
  return handleAuthCallback(url);
}
