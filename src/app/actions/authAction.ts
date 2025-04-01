'use server';

import { invalidateUserCache } from '@/app/actions/userAction';
import { supabaseAuth } from '@/lib/supabase/auth';

/**
 * Sign in with OAuth provider
 */
export async function signInWithOAuth(provider: 'google' | 'github', redirectUrl: string) {
  try {
    console.log('[@action:auth:signInWithOAuth] Starting OAuth flow', {
      provider,
      redirectUrl: redirectUrl.replace(/\?.+$/, '?...'), // Sanitize URL parameters
    });

    // Use standard OAuth flow
    const result = await supabaseAuth.signInWithOAuth(provider, {
      redirectTo: redirectUrl,
    });

    if (result.success && result.data?.url) {
      console.log('[@action:auth:signInWithOAuth] Successfully initiated OAuth flow', { provider });
    } else {
      console.warn('[@action:auth:signInWithOAuth] Failed to initiate OAuth flow', {
        provider,
        error: result.error,
      });
    }

    return {
      success: result.success,
      error: result.error || null,
      data: result.data || null,
    };
  } catch (error: any) {
    console.error('[@action:auth:signInWithOAuth] Error initiating OAuth flow', {
      provider,
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message || 'Failed to sign in', data: null };
  }
}

/**
 * Handle OAuth callback from Supabase Auth
 */
export async function handleAuthCallback(urlOrCode: string) {
  try {
    console.log('[@action:auth:handleAuthCallback] Starting auth callback process');

    // If this is a URL, extract the code
    let code = urlOrCode;
    if (urlOrCode.startsWith('http')) {
      const url = new URL(urlOrCode);
      const codeParam = url.searchParams.get('code');
      if (codeParam) {
        code = codeParam;
        console.log('[@action:auth:handleAuthCallback] Extracted code from URL', {
          codePrefix: code.substring(0, 6) + '...',
        });
      } else {
        console.error('[@action:auth:handleAuthCallback] No code provided in URL');
        throw new Error('No code provided in URL');
      }
    } else {
      console.log('[@action:auth:handleAuthCallback] Using provided code', {
        codePrefix: code.substring(0, 6) + '...',
      });
    }

    // Invalidate user cache before processing callback
    await invalidateUserCache();
    console.log('[@action:auth:handleAuthCallback] User cache invalidated');

    // Exchange the code for a session
    console.log('[@action:auth:handleAuthCallback] Exchanging code for session');
    const result = await supabaseAuth.handleOAuthCallback(code);

    if (!result.success) {
      console.error('[@action:auth:handleAuthCallback] Authentication failed', {
        error: result.error,
      });
      return {
        success: false,
        error: result.error || 'Failed to authenticate',
        redirectUrl: '/login?error=Authentication+failed',
      };
    }

    return handleAuthSuccess(result, urlOrCode);
  } catch (error: any) {
    console.error('[@action:auth:handleAuthCallback] Exception in auth process', {
      error: error.message,
      stack: error.stack,
    });
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
  console.log('[@action:auth:handleAuthSuccess] Starting handleAuthSuccess function');

  // Log session details for debugging
  const session = result.data.session;
  console.log('[@action:auth:handleAuthSuccess] Session present', { isPresent: !!session });

  if (session) {
    console.log('[@action:auth:handleAuthSuccess] Session details', {
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
      userId: session.user.id,
      userEmail: session.user.email,
    });
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

  console.log('[@action:auth:handleAuthSuccess] Using locale', { locale });

  // Log for debugging
  console.log('[@action:auth:handleAuthSuccess] Redirect using tenant', { tenantName });

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
    console.log('[@action:auth:signOut] Starting sign out process');
    // Get locale from form data for redirect
    const locale = formData.get('locale') || 'en';
    console.log('[@action:auth:signOut] Using locale for redirect', { locale });

    // Invalidate user cache
    await invalidateUserCache();
    console.log('[@action:auth:signOut] User cache invalidated');

    // Sign out from Supabase
    const result = await supabaseAuth.signOut();

    if (!result.success) {
      console.error('[@action:auth:signOut] Sign out failed', {
        error: result.error,
      });
      return {
        success: false,
        error: result.error || 'Sign out failed',
        redirectUrl: `/${locale}/login?error=signout`,
      };
    }

    // Set cache-busting query parameter to prevent browser cache issues
    const timestamp = Date.now();
    const redirectUrl = `/${locale}/login?t=${timestamp}`;

    console.log('[@action:auth:signOut] Successfully signed out', { redirectUrl });

    // Return success and redirect URL
    return {
      success: true,
      redirectUrl,
    };
  } catch (error: any) {
    console.error('[@action:auth:signOut] Error during sign out', {
      error: error.message,
      stack: error.stack,
    });
    // Still return some redirect URL even on error
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during sign out',
      redirectUrl: `/${formData.get('locale') || 'en'}/login?error=signout`,
    };
  }
}

/**
 * Exchange code for session - simplified function for client components
 */
export async function exchangeCodeForSession(url: string) {
  return handleAuthCallback(url);
}

/**
 * Handle email and password authentication
 */
export async function handleAuthWithEmail(formData: FormData) {
  try {
    console.log('[@action:auth:handleAuthWithEmail] Starting email auth process');
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Input validation
    if (!email || !email.trim()) {
      console.warn('[@action:auth:handleAuthWithEmail] Email missing or empty');
      return {
        success: false,
        error: 'Email is required',
      };
    }

    if (!password) {
      console.warn('[@action:auth:handleAuthWithEmail] Password missing');
      return {
        success: false,
        error: 'Password is required',
      };
    }

    console.log('[@action:auth:handleAuthWithEmail] Attempting sign in with email');
    const result = await supabaseAuth.signInWithPassword(email, password);

    // Handle sign-in failure
    if (!result.success) {
      console.error('[@action:auth:handleAuthWithEmail] Authentication failed', {
        error: result.error,
      });
      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    }

    console.log('[@action:auth:handleAuthWithEmail] Sign in successful');

    return {
      success: true,
      redirectUrl: '/dashboard',
    };
  } catch (error: any) {
    console.error('[@action:auth:handleAuthWithEmail] Exception in auth process', {
      error: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      error: error.message || 'Authentication failed',
    };
  }
}
