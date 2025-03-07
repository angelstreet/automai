'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';

export default function AuthRedirectPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Helper function to ensure session is persisted across different storage mechanisms
  const ensureSessionPersistence = async (session: any, supabase: any) => {
    try {
      // 1. Check if cookies are set properly
      const allCookies = document.cookie.split(';').map(c => c.trim());
      const hasSbAuthCookie = allCookies.some(c => 
        c.startsWith('sb-access-token=') || 
        c.startsWith('sb-refresh-token=')
      );
      
      // 2. Make sure localStorage items are set
      let localStorageAvailable = false;
      try {
        localStorageAvailable = typeof localStorage !== 'undefined';
        if (localStorageAvailable) {
          // Set session to localStorage for redundancy
          localStorage.setItem('supabase.auth.token', JSON.stringify({
            timestamp: new Date().toISOString(),
            userId: session.user.id,
            email: session.user.email,
          }));
          
          // Set custom user-session cookie with proper attributes
          const maxAge = 86400; // 24 hours
          document.cookie = `user-session=${session.user.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
          console.log('Set user-session cookie with userId:', session.user.id);
        }
      } catch (e) {
        console.error('localStorage access error:', e);
      }
      
      // 3. If cookies aren't set properly, try to manually set session
      if (!hasSbAuthCookie) {
        console.log('No Supabase auth cookies found, manually setting session');
        try {
          // Try to set the session again with explicit persistence
          await supabase.auth.setSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token || '',
          });
          console.log('Manual setSession completed');
          
          // Verify cookies were set
          const cookiesAfterSet = document.cookie.split(';').map(c => c.trim());
          const hasCookiesAfterSet = cookiesAfterSet.some(c => 
            c.startsWith('sb-access-token=') || 
            c.startsWith('sb-refresh-token=')
          );
          
          if (!hasCookiesAfterSet) {
            console.warn('Still no Supabase auth cookies after manual setSession');
            
            // Manually set the Supabase cookies with correct attributes
            try {
              // Set access token cookie
              document.cookie = `sb-access-token=${session.access_token}; path=/; max-age=3600; SameSite=Lax`;
              
              // Set refresh token cookie if available
              if (session.refresh_token) {
                document.cookie = `sb-refresh-token=${session.refresh_token}; path=/; max-age=7776000; SameSite=Lax`;
              }
              
              console.log('Manually set Supabase auth cookies with correct attributes');
            } catch (e) {
              console.error('Error manually setting Supabase cookies:', e);
            }
            
            // Set a fallback cookie with the access token
            try {
              document.cookie = `sb-fallback-token=${session.access_token.substring(0, 10)}...; path=/; max-age=86400; SameSite=Lax`;
              console.log('Set fallback token cookie');
            } catch (e) {
              console.error('Error setting fallback token cookie:', e);
            }
          } else {
            console.log('Supabase auth cookies successfully set after manual setSession');
          }
        } catch (e) {
          console.error('Error manually setting session:', e);
        }
      }
      
      return true;
    } catch (e) {
      console.error('Error ensuring session persistence:', e);
      return false;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Log detailed information about the environment
    const isCodespace = window.location.hostname.includes('.app.github.dev');
    const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const environmentType = isCodespace ? 'Codespace' : isDevelopment ? 'Development' : 'Production';
    
    console.log('=== AUTH REDIRECT PAGE LOADED ===');
    console.log('URL:', window.location.href);
    console.log('Environment:', environmentType);
    console.log('Hostname:', window.location.hostname);
    console.log('Origin:', window.location.origin);
    console.log('Hash present:', !!window.location.hash);
    console.log('Search params:', window.location.search);
    
    const handleAuth = async () => {
      try {
        const supabase = createBrowserSupabase();
        
        console.log('Checking for session tokens in URL...');
        let authSession = null;
        
        // First, check for access token in the URL hash (implicit flow)
        if (window.location.hash && window.location.hash.includes('access_token=')) {
          console.log('Found access token in URL hash - processing token directly');
          try {
            // Use Supabase's createSessionFromUrl helper
            const { data: hashData, error: hashError } = await supabase.auth.createSessionFromUrl(window.location.href);
            
            if (hashError) {
              console.error('Error creating session from URL hash:', hashError);
            } else if (hashData?.session) {
              console.log('Successfully created session from URL hash!');
              authSession = hashData.session;
            }
          } catch (hashErr) {
            console.error('Exception processing URL hash:', hashErr);
          }
        }
        
        // If we couldn't get a session from the hash, try getSession
        if (!authSession) {
          console.log('No session from hash, checking existing session...');
          // Let Supabase handle the session extraction from URL (it does this automatically)
          // This works for both hash fragments (#access_token=) and query parameters (?code=)
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting session:', error.message);
            setStatus('error');
            setErrorMessage(error.message);
            return;
          }
          
          if (data?.session) {
            console.log('Session found from getSession!');
            authSession = data.session;
          }
        }
        
        // Process the session (regardless of where it came from)
        if (authSession) {
          console.log('Session details:', {
            email: authSession.user.email,
            id: authSession.user.id,
            accessTokenLength: authSession.access_token?.length || 0,
            refreshTokenLength: authSession.refresh_token?.length || 0,
            expiresAt: authSession.expires_at ? new Date(authSession.expires_at * 1000).toISOString() : 'unknown'
          });
          
          // Extract tenant ID or use default
          const tenantId = authSession.user.user_metadata?.tenantId || 'trial';
          
          // If we need to update user metadata, do it here
          if (!authSession.user.user_metadata?.tenantId) {
            try {
              console.log('Updating user metadata with default tenant information');
              await supabase.auth.updateUser({
                data: {
                  role: 'user',
                  tenantId: 'trial',
                  tenantName: 'trial',
                }
              });
              console.log('User metadata updated with default tenant');
            } catch (e) {
              console.error('Failed to update user metadata:', e);
              // Continue anyway since this isn't critical
            }
          }
          
          // Ensure session is properly persisted before redirecting
          console.log('Ensuring session persistence...');
          await ensureSessionPersistence(authSession, supabase);
          
          // Double-check session is valid before redirecting
          const { data: checkData } = await supabase.auth.getSession();
          if (checkData?.session) {
            console.log('Session check after persistence confirms valid session:',
              checkData.session.user.email);
          } else {
            console.warn('WARNING: Session not found after persistence attempt!');
            // One more try with setSession
            try {
              console.log('Final attempt to set session manually');
              await supabase.auth.setSession({
                access_token: authSession.access_token,
                refresh_token: authSession.refresh_token || '',
              });
              
              // Verify cookies are set
              const finalCookies = document.cookie.split(';').map(c => c.trim());
              const hasFinalCookies = finalCookies.some(c => 
                c.startsWith('sb-access-token=') || 
                c.startsWith('sb-refresh-token=') ||
                c.startsWith('user-session=')
              );
              
              if (!hasFinalCookies) {
                console.warn('CRITICAL: Still no auth cookies after final attempt');
                // Force set cookies with direct DOM API
                document.cookie = `user-session=${authSession.user.id}; path=/; max-age=86400; SameSite=Lax`;
                document.cookie = `sb-fallback-token=${authSession.access_token.substring(0, 10)}...; path=/; max-age=86400; SameSite=Lax`;
              }
            } catch (e) {
              console.error('Final session set attempt failed:', e);
              // Force set cookies as last resort
              document.cookie = `user-session=${authSession.user.id}; path=/; max-age=86400; SameSite=Lax`;
              document.cookie = `sb-fallback-token=${authSession.access_token.substring(0, 10)}...; path=/; max-age=86400; SameSite=Lax`;
            }
          }
          
          // Redirect to dashboard
          setStatus('success');
          const dashboardUrl = `/${locale}/${tenantId}/dashboard`;
          console.log('Redirecting to dashboard:', dashboardUrl);
          
          // Small delay to ensure UI updates and cookies are set before redirect
          setTimeout(() => {
            // Force reload to ensure cookies are properly recognized
            window.location.href = dashboardUrl;
          }, 500);
          
        } else {
          console.log('No session found, redirecting to login');
          setStatus('error');
          setErrorMessage('Authentication failed - no session was created');
          
          // Redirect to login after a brief delay
          setTimeout(() => {
            window.location.href = `/${locale}/login?error=${encodeURIComponent('Authentication failed - no session was created')}`;
          }, 1000);
        }
      } catch (error: any) {
        console.error('Unexpected error during authentication:', error);
        setStatus('error');
        setErrorMessage(error.message || 'An unexpected error occurred');
        
        // Redirect to login after a brief delay
        setTimeout(() => {
          window.location.href = `/${locale}/login?error=${encodeURIComponent(error.message || 'An unexpected error occurred')}`;
        }, 1000);
      }
    };

    handleAuth();
  }, [locale]);

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
