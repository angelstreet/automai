'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import supabaseAuth from '@/lib/supabase-auth';
import { createBrowserSupabase } from '@/lib/supabase';

export default function AuthRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const { user } = useUser();

  // Handle direct access token in URL hash fragment for Codespaces auth flow
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Use a simpler approach to handle the access token in the URL hash
    const handleAuthentication = async () => {
      try {
        const hash = window.location.hash;
        const uri = window.location.search;
        console.log('Current URL hash:', hash ? hash.substring(0, 20) + '...' : 'none');
        console.log('Current URL search:', uri);
        console.log('Full URL:', window.location.href);
        
        // Debug output to check if we can process the hash correctly
        if (hash && hash.includes('access_token=')) {
          // Just for debugging - Don't log this in production
          try {
            const debugParams = Object.fromEntries(
              hash.substring(1).split('&').map(param => {
                const [key, value] = param.split('=');
                return [key, 
                  key === 'access_token' || key === 'refresh_token' 
                    ? value.substring(0, 10) + '...' 
                    : decodeURIComponent(value)
                ];
              })
            );
            console.log('Hash parameters found:', debugParams);
          } catch (e) {
            console.error('Error parsing hash for debug:', e);
          }
        }
        
        // First check if we have a code parameter in the URL (authorization code flow)
        // This happens when the user is redirected back from OAuth provider
        if (uri && uri.includes('code=')) {
          console.log('Authorization code detected in URL params');
          // The Supabase Auth library should handle this automatically
          // when we call getSession
          const supabase = createBrowserSupabase();
          const { data, error } = await supabase.auth.getSession();
          
          if (data?.session) {
            console.log('Session established from authorization code');
            setSession(data.session);
            setStatus('authenticated');
            return;
          } else {
            console.error('Failed to establish session from authorization code:', error);
          }
        }
        
        // If we have a hash with access token, we need to use it directly (implicit flow)
        if (hash && hash.includes('access_token=')) {
          console.log('Hash with access_token detected, parsing manually');
          
          // Parse the hash to extract parameters - this is a simple approach
          // for handling the implicit flow in Codespaces
          const params = Object.fromEntries(
            hash.substring(1).split('&').map(param => {
              const [key, value] = param.split('=');
              return [key, decodeURIComponent(value)];
            })
          );
          
          if (params.access_token) {
            console.log('Successfully parsed access token from URL hash');
            console.log('Token params:', {
              token_type: params.token_type,
              expires_in: params.expires_in,
              expires_at: params.expires_at,
              provider_token: params.provider_token ? 'present' : 'not present',
              refresh_token: params.refresh_token ? 'present' : 'not present',
            });
            
            try {
              // Create a fresh Supabase client for authentication
              console.log('Creating fresh Supabase client for auth...');
              const supabase = createBrowserSupabase();
              
              // First try to ensure the tokens are processed via URL detection
              console.log('Attempting to process token from URL first...');
              await supabase.auth.getSession();
              
              // Check if that worked
              console.log('Checking if URL token processing worked...');
              const initialSession = await supabase.auth.getSession();
              if (initialSession.data?.session) {
                console.log('Session automatically established from URL!');
                setSession(initialSession.data.session);
                setStatus('authenticated');
                return;
              }
              
              // If URL detection didn't work, explicitly set the session
              console.log('URL detection did not establish session, trying explicit setSession...');
              const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token || '',
              });
              
              if (sessionError) {
                console.error('Error setting session:', sessionError);
                // Log detailed error information
                console.log('Session error details:', {
                  message: sessionError.message,
                  status: sessionError.status,
                  name: sessionError.name,
                  stack: sessionError.stack?.substring(0, 200)
                });
              }
              
              if (sessionData?.session) {
                console.log('Session explicitly established from access token');
                setSession(sessionData.session);
                setStatus('authenticated');
                return;
              }
              
              // As a last resort, try signing in with the provider token if available
              if (params.provider_token && params.provider_token.startsWith('gho_')) {
                console.log('Attempting to use provider token (GitHub) as fallback...');
                try {
                  const { data: oauthData, error: oauthError } = await supabase.auth.signInWithOAuth({
                    provider: 'github',
                    options: {
                      redirectTo: window.location.origin + '/' + locale + '/auth-redirect',
                      skipBrowserRedirect: true,
                    }
                  });
                  
                  if (oauthError) {
                    console.error('OAuth fallback error:', oauthError);
                  } else if (oauthData) {
                    console.log('OAuth initialization successful');
                    
                    // Check session again
                    const { data: recheck } = await supabase.auth.getSession();
                    if (recheck?.session) {
                      console.log('Session established after OAuth fallback');
                      setSession(recheck.session);
                      setStatus('authenticated');
                      return;
                    }
                  }
                } catch (oauthErr) {
                  console.error('OAuth fallback failed:', oauthErr);
                }
              }
              
              // Final attempt - check one more time for a session
              console.log('Final attempt to get session...');
              const { data: finalCheck, error: finalError } = await supabase.auth.getSession();
              
              if (finalError) {
                console.error('Final session check error:', finalError);
              }
              
              if (finalCheck?.session) {
                console.log('Session found in final check');
                setSession(finalCheck.session);
                setStatus('authenticated');
              } else {
                console.error('AUTHENTICATION FAILED: Could not establish session from tokens');
                console.log('Authentication flow exhausted all options');
                setStatus('unauthenticated');
              }
            } catch (error) {
              console.error('Error processing authentication token:', error);
              // More detailed error information
              console.log('Error details:', {
                message: error.message,
                name: error.name,
                stack: error.stack?.substring(0, 200)
              });
              setStatus('unauthenticated');
            }
          }
        } else {
          // No hash fragment, try normal session retrieval
          console.log('No hash fragment, checking for existing session');
          const { data, error } = await supabaseAuth.getSession();
          
          if (error) {
            console.error('Error retrieving session:', error);
            setStatus('unauthenticated');
          } else if (data?.session) {
            console.log('Existing session found');
            setSession(data.session);
            setStatus('authenticated');
          } else {
            console.log('No existing session found');
            setStatus('unauthenticated');
          }
        }
      } catch (error) {
        console.error('Authentication error:', error);
        setStatus('unauthenticated');
      }
    };
    
    handleAuthentication();
  }, []);

  // Debug logging on initial render
  useEffect(() => {
    console.log('Auth redirect page loaded:', {
      params,
      locale,
      sessionStatus: status,
      hasSession: !!session,
      userData: session?.user
        ? {
            id: session.user.id,
            email: session.user.email,
            tenant: user?.tenantName || 'trial',
          }
        : null,
      url: typeof window !== 'undefined' ? window.location.href : '',
      hash: typeof window !== 'undefined' ? window.location.hash : '',
    });
  }, [params, locale, status, session, user]);

  useEffect(() => {
    // Debug logging on each effect run
    console.log('Auth redirect effect running:', {
      isRedirecting,
      sessionStatus: status,
      hasSession: !!session,
      userFromContext: user ? { id: user.id, tenantName: user.tenantName } : null,
    });

    // Prevent multiple redirects
    if (isRedirecting) return;

    // Wait for session to be loaded
    if (status === 'loading') return;

    // Handle token in URL hash for direct access to root /auth-redirect
    if (window.location.pathname === '/auth-redirect') {
      console.log('Detected access to root /auth-redirect, redirecting to /' + locale + '/auth-redirect with hash');
      const origin = window.location.origin;
      const hash = window.location.hash;
      window.location.href = `${origin}/${locale}/auth-redirect${hash}`;
      return;
    }
    
    // Check for stored tokens in sessionStorage (from the root redirect)
    try {
      if (typeof sessionStorage !== 'undefined' && 
          !window.location.hash && 
          (sessionStorage.getItem('auth_redirect_hash') || sessionStorage.getItem('supabase.auth.access_token'))) {
        
        console.log('Found saved auth tokens in sessionStorage, attempting to use them');
        
        // We don't want to modify the URL, just use the stored tokens if needed
        if (!session && status === 'unauthenticated') {
          console.log('No session established, trying to recover using saved tokens');
          
          const accessToken = sessionStorage.getItem('supabase.auth.access_token');
          const refreshToken = sessionStorage.getItem('supabase.auth.refresh_token');
          const tokenType = sessionStorage.getItem('supabase.auth.token_type');
          const expiresAt = sessionStorage.getItem('supabase.auth.expires_at');
          
          if (accessToken) {
            console.log('Found access token in sessionStorage, attempting to establish session');
            
            try {
              // Create a fresh Supabase client
              const supabase = createBrowserSupabase();
              
              // Try to set the session with the stored tokens
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
              
              if (error) {
                console.error('Error setting session from stored tokens:', error);
              } else if (data?.session) {
                console.log('Successfully established session from stored tokens!');
                setSession(data.session);
                setStatus('authenticated');
              }
            } catch (err) {
              console.error('Error recovering session from stored tokens:', err);
            }
          }
        }
        
        // Clear the saved tokens to prevent reuse
        console.log('Clearing stored auth tokens from sessionStorage');
        sessionStorage.removeItem('auth_redirect_hash');
        sessionStorage.removeItem('supabase.auth.token_type');
        sessionStorage.removeItem('supabase.auth.access_token');
        sessionStorage.removeItem('supabase.auth.refresh_token');
        sessionStorage.removeItem('supabase.auth.expires_at');
        sessionStorage.removeItem('supabase.auth.provider_token');
      }
    } catch (e) {
      console.error('Error checking sessionStorage for saved tokens:', e);
    }

    const handleRedirect = async () => {
      setIsRedirecting(true);
      try {
        // If we have a session, redirect to the appropriate dashboard
        if (session?.user) {
          // Extract tenant from user metadata or context, or default to trial
          const tenantId = session.user.user_metadata?.tenantId || user?.tenantId || 'trial';
          const tenantName = session.user.user_metadata?.tenantName || user?.tenantName || 'Trial';
          
          console.log('Session data:', {
            userId: session.user.id,
            email: session.user.email,
            tenantId,
            tenantName,
            accessToken: session.access_token ? 'present' : 'missing',
            userMetadata: session.user.user_metadata || {},
          });

          // Check if this is a fresh user login that needs additional setup
          const needsSetup = !session.user.user_metadata?.tenantId;
          if (needsSetup) {
            console.log('New user detected, updating user metadata');
            try {
              // Add default tenant information to user metadata
              await supabaseAuth.updateUser({
                data: {
                  tenantId: 'trial',
                  tenantName: 'Trial',
                  role: 'user',
                }
              });
              console.log('User metadata updated successfully');
            } catch (err) {
              console.error('Failed to update user metadata:', err);
              // Continue with redirect anyway
            }
          }

          // Get the current origin
          const origin = window.location.origin;
          const redirectUrl = `${origin}/${locale}/${tenantId}/dashboard`;
          console.log('Redirecting to dashboard:', redirectUrl);

          // Use window.location for a hard redirect to avoid Next.js routing issues
          window.location.href = redirectUrl;
        } else {
          // No session means authentication failed
          console.error('No session available');

          // Get the current origin
          const origin = window.location.origin;
          const loginUrl = `${origin}/${locale}/login?error=Authentication failed - no session`;
          console.log('Redirecting to login:', loginUrl);

          // Use window.location for a hard redirect
          window.location.href = loginUrl;
        }
      } catch (error) {
        console.error('Error during redirect:', error);
        const origin = window.location.origin;
        window.location.href = `${origin}/${locale}/login?error=${encodeURIComponent('Failed to authenticate: ' + error)}`;
      }
    };

    handleRedirect();
  }, [locale, router, isRedirecting, session, status, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-primary animate-pulse"
          >
            <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
          </svg>
          <span className="text-2xl font-bold">Automai</span>
        </div>
        <h2 className="text-xl font-semibold">Setting up your workspace...</h2>
        <p className="text-sm text-muted-foreground">
          {status === 'loading'
            ? 'Loading session...'
            : status === 'authenticated'
              ? 'Session found, redirecting...'
              : 'No session found, redirecting to login...'}
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}
