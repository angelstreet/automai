'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';

export default function AuthRedirectPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Simple function to store minimal session info for debugging
  const storeSessionInfo = (session: any) => {
    try {
      if (typeof sessionStorage !== 'undefined' && session?.user) {
        // Store basic info in sessionStorage for debugging
        sessionStorage.setItem('auth_redirect_timestamp', Date.now().toString());
        sessionStorage.setItem('auth_user_id', session.user.id);
        sessionStorage.setItem('auth_user_email', session.user.email || '');
      }
    } catch (e) {
      console.error('Error storing session info:', e);
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
        console.log('Processing authentication...');
        let authSession = null;
        
        // Log initial auth status
        console.log('[Auth-Redirect] Auth flow started', {
          hasHash: !!window.location.hash,
          hasCode: window.location.search.includes('code='),
          url: window.location.href.split('?')[0] // Log URL without query params for privacy
        });
        
        // Session detection - Supabase will automatically detect and handle the session from the URL
        // This works for both hash fragments and query parameters
        const { data, error } = await supabase.auth.getSession();
        
        // Log session details
        if (error) {
          console.error('[Auth-Redirect] Error getting session:', error);
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }
        
        if (data?.session) {
          console.log('[Auth-Redirect] Session found', {
            email: data.session.user.email,
            id: data.session.user.id.substring(0, 6) + '...',
            provider: data.session.user.app_metadata?.provider || 'unknown',
            tokenLength: data.session.access_token?.length || 0,
          });
          authSession = data.session;
        } else {
          console.error('[Auth-Redirect] No session found after auth flow');
        }
        
        // Process valid session
        if (authSession) {
          // Store session info for debugging
          storeSessionInfo(authSession);
          
          // Set default tenant if needed
          if (!authSession.user.user_metadata?.tenantId) {
            try {
              console.log('[Auth-Redirect] Setting default tenant metadata');
              await supabase.auth.updateUser({
                data: {
                  role: 'user',
                  tenantId: 'trial',
                  tenantName: 'trial',
                }
              });
              console.log('[Auth-Redirect] User metadata updated');
            } catch (e) {
              console.error('[Auth-Redirect] Error updating user metadata:', e);
              // Continue anyway since this isn't critical
            }
          }
          
          // Verify the session one more time after updates
          const { data: verifyData } = await supabase.auth.getSession();
          if (verifyData?.session) {
            console.log('[Auth-Redirect] Session verified after updates');
          }
          
          // Get tenant ID for redirect
          const tenantId = authSession.user.user_metadata?.tenantId || 'trial';
          
          // Successful authentication
          setStatus('success');
          const dashboardUrl = `/${locale}/${tenantId}/dashboard`;
          console.log('[Auth-Redirect] Redirecting to:', dashboardUrl);
          
          // Redirect with short delay to ensure UI updates and cookies are set
          setTimeout(() => {
            window.location.href = dashboardUrl;
          }, 300);
          
        } else {
          // No session found
          console.error('[Auth-Redirect] No valid session found after auth process');
          setStatus('error');
          setErrorMessage('Authentication failed - no session was created');
          
          setTimeout(() => {
            window.location.href = `/${locale}/login?error=${encodeURIComponent('Authentication failed')}`;
          }, 800);
        }
      } catch (error: any) {
        console.error('[Auth-Redirect] Unhandled authentication error:', error);
        console.error('[Auth-Redirect] Error details:', {
          message: error.message,
          stack: error.stack?.split('\n')[0] || 'No stack trace',
          url: window.location.pathname,
          hasHash: !!window.location.hash,
          hasCode: window.location.search.includes('code='),
        });
        
        setStatus('error');
        setErrorMessage(error.message || 'An unexpected error occurred');
        
        setTimeout(() => {
          window.location.href = `/${locale}/login?error=${encodeURIComponent(error.message || 'An unexpected error occurred')}`;
        }, 800);
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
