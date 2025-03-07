'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient, createSessionFromUrl, exchangeCodeForSession, corsHeaders } from '@/utils/supabase/client';
import { Session, User, AuthError } from '@supabase/supabase-js';

interface AuthSession {
  user: User;
  access_token: string;
  refresh_token: string;
}

// Update the setAuthCookies function type
const setAuthCookies = (session: Session): boolean => {
  try {
    if (!session?.user) return false;
    
    // Determine environment and set appropriate domain
    const hostname = window.location.hostname;
    let cookieDomain = '';
    
    if (hostname.includes('github.dev')) {
      // For GitHub Codespaces
      cookieDomain = '.app.github.dev';
    } else if (hostname.includes('github.io')) {
      // For GitHub Pages
      cookieDomain = '.github.io';  
    } else if (hostname.includes('vercel.app')) {
      // For Vercel deployments
      cookieDomain = '.vercel.app';
    }
    // localhost doesn't need domain specified
    
    // Cookie options based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      'path=/',
      'max-age=604800',
      'SameSite=Lax',
      isProduction ? 'Secure' : '',
      cookieDomain ? `domain=${cookieDomain}` : ''
    ].filter(Boolean).join('; ');
    
    // Set cookies with appropriate domain
    document.cookie = `user-session=${session.user.id}; ${cookieOptions}`;
    
    const provider = session.user.app_metadata?.provider || 'unknown';
    document.cookie = `auth-provider=${provider}; ${cookieOptions}`;
    
    console.log('[Auth-Redirect] Cookies set with options:', {
      domain: cookieDomain || 'default',
      isProduction,
      sameSite: 'Lax',
      secure: isProduction
    });
    
    return true;
  } catch (e) {
    console.error('[Auth-Redirect] Error setting auth cookies:', e);
    return false;
  }
};

export default function AuthRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'en';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('[Auth-Redirect] Page loaded:', window.location.href);
    console.log('[Auth-Redirect] Hash fragment:', window.location.hash);
    console.log('[Auth-Redirect] Search params:', window.location.search);
    
    const handleAuth = async () => {
      try {
        const supabase = createClient();
        
        console.log('[Auth-Redirect] Attempting to handle auth redirect');
        console.log('[Auth-Redirect] URL:', window.location.href);
        console.log('[Auth-Redirect] Hash fragment:', window.location.hash);
        console.log('[Auth-Redirect] Search params:', window.location.search);
        
        const isCodespace = window.location.hostname.includes('.app.github.dev');
        console.log('[Auth-Redirect] Is Codespace environment:', isCodespace);
        
        // For GitHub Codespaces, we prioritize hash fragment (implicit flow)
        if (isCodespace && window.location.hash) {
          console.log('[Auth-Redirect] Using hash fragment for Codespace auth (implicit flow)');
          
          try {
            // Parse the hash fragment manually
            const hashParams = new URLSearchParams(window.location.hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');
            
            if (accessToken) {
              console.log('[Auth-Redirect] Found access_token in hash fragment');
              
              // Set the session directly using tokens from the hash
              const { data, error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken || '',
              });
              
              if (error) {
                console.error('[Auth-Redirect] Error setting session from hash tokens:', error);
              } else {
                console.log('[Auth-Redirect] Successfully set session from hash tokens');
              }
            } else {
              console.warn('[Auth-Redirect] No access_token found in hash fragment');
            }
          } catch (hashError) {
            console.error('[Auth-Redirect] Error processing hash fragment:', hashError);
          }
        } else if (window.location.search.includes('code=')) {
          // PKCE flow - code in URL query params
          console.log('[Auth-Redirect] Detected code parameter (PKCE flow)');
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');
          
          if (code) {
            console.log('[Auth-Redirect] Exchanging code for session');
            
            try {
              // First try with built-in method
              const { data, error } = await supabase.auth.exchangeCodeForSession(code);
              
              if (error) {
                console.error('[Auth-Redirect] Built-in code exchange failed:', error);
                // Fall back to proxy endpoint
                try {
                  const { data: proxyData, error: proxyError } = await exchangeCodeForSession(code);
                  
                  if (proxyError) {
                    console.error('[Auth-Redirect] Proxy code exchange also failed:', proxyError);
                  } else {
                    console.log('[Auth-Redirect] Proxy code exchange succeeded');
                  }
                } catch (proxyError) {
                  console.error('[Auth-Redirect] Error in proxy code exchange:', proxyError);
                }
              } else {
                console.log('[Auth-Redirect] Built-in code exchange succeeded');
              }
            } catch (codeError) {
              console.error('[Auth-Redirect] Code exchange error:', codeError);
            }
          }
        } else {
          // If no specific auth parameters found, try the generic method
          console.log('[Auth-Redirect] No specific auth parameters found, trying createSessionFromUrl');
          
          try {
            const { data, error } = await createSessionFromUrl(window.location.href);
            
            if (error) {
              console.error('[Auth-Redirect] Error creating session from URL:', error);
            } else if (data.session) {
              console.log('[Auth-Redirect] Session created successfully from URL');
            } else {
              console.warn('[Auth-Redirect] No session created from URL');
            }
          } catch (err) {
            console.error('[Auth-Redirect] Exception in createSessionFromUrl:', err);
          }
        }

        // Now check session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('[Auth-Debug] Session state:', {
          hasSession: !!session,
          sessionUser: session?.user?.email,
          error: error?.message,
          hasAccessToken: session?.access_token ? true : false
        });

        if (session?.user) {
          // Try to set cookies but don't fail if they don't work
          try {
            setAuthCookies(session);
          } catch (cookieError) {
            console.warn('[Auth] Cookie setup failed:', cookieError);
          }
          
          // Proceed with session regardless of cookies
          setStatus('success');
          router.push(`/${locale}/dashboard`);
          return;
        }

        // Only reach here if no session
        setStatus('error');
        setErrorMessage('No valid session found');
      } catch (error) {
        console.error('[Auth] Fatal error:', error);
        setStatus('error');
      }
    };

    handleAuth();
  }, [locale, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 text-foreground">
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
          <span className="text-2xl font-bold text-foreground">Automai</span>
        </div>
        <h2 className="text-xl font-semibold text-foreground">Setting up your workspace...</h2>
        
        {status === 'loading' && (
          <>
            <p className="text-sm text-muted-foreground">Authenticating your account...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </>
        )}
        
        {status === 'success' && (
          <p className="text-sm text-green-500">Successfully authenticated! Redirecting to dashboard...</p>
        )}
        
        {status === 'error' && (
          <div className="space-y-2">
            <p className="text-sm text-red-500">Authentication failed</p>
            {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}
            <p className="text-sm text-muted-foreground">Redirecting to login page...</p>
          </div>
        )}
      </div>
    </div>
  );
}
