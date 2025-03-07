'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';

export default function AuthRedirectPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Helper function to safely set authentication cookies
  const setAuthCookies = (session: any) => {
    try {
      if (!session?.user) return false;
      
      // Cookie options - secure in production
      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = `path=/; max-age=604800; SameSite=Lax${isProduction ? '; Secure' : ''}`;
      
      // Main authentication cookie - contains user ID only (not sensitive)
      document.cookie = `user-session=${session.user.id}; ${cookieOptions}`;
      
      // Store provider type for analytics
      const provider = session.user.app_metadata?.provider || 'unknown';
      document.cookie = `auth-provider=${provider}; ${cookieOptions}`;
      
      // Store minimal non-sensitive UI preferences in localStorage
      if (typeof localStorage !== 'undefined') {
        // Store display name for UI personalization
        if (session.user.user_metadata?.name) {
          localStorage.setItem('user-name', session.user.user_metadata.name);
        }
      }
      
      console.log('[Auth-Redirect] Auth cookies set successfully');
      return true;
    } catch (e) {
      console.error('[Auth-Redirect] Error setting auth cookies:', e);
      return false;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('[Auth-Redirect] Page loaded:', window.location.href.split('?')[0]);
    
    const handleAuth = async () => {
      try {
        // Create Supabase client - this will automatically handle the auth callback
        const supabase = createBrowserSupabase();
        console.log('[Auth-Redirect] Processing authentication...');
        
        // Get session - Supabase will automatically process the auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[Auth-Redirect] Error getting session:', error);
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }
        
        if (!data?.session) {
          console.error('[Auth-Redirect] No session found after auth flow');
          setStatus('error');
          setErrorMessage('Authentication failed - no session was created');
          
          setTimeout(() => {
            window.location.href = `/${locale}/login?error=${encodeURIComponent('Authentication failed')}`;
          }, 800);
          return;
        }
        
        // Log successful authentication
        console.log('[Auth-Redirect] Session found', {
          provider: data.session.user.app_metadata?.provider || 'unknown',
          email: data.session.user.email || 'no-email',
        });
        
        // Set default tenant if needed
        if (!data.session.user.user_metadata?.tenantId) {
          try {
            await supabase.auth.updateUser({
              data: {
                role: 'user',
                tenantId: 'trial',
                tenantName: 'trial',
              }
            });
            console.log('[Auth-Redirect] User metadata updated with default tenant');
          } catch (e) {
            console.error('[Auth-Redirect] Error updating user metadata:', e);
            // Continue anyway since this isn't critical
          }
        }
        
        // Set auth cookies for middleware authentication
        setAuthCookies(data.session);
        
        // Get tenant for redirect
        const tenantId = data.session.user.user_metadata?.tenantId || 'trial';
        
        // Successful authentication
        setStatus('success');
        const dashboardUrl = `/${locale}/${tenantId}/dashboard`;
        console.log('[Auth-Redirect] Redirecting to:', dashboardUrl);
        
        // Redirect with short delay to ensure UI updates and cookies are set
        setTimeout(() => {
          window.location.href = dashboardUrl;
        }, 300);
        
      } catch (error: any) {
        console.error('[Auth-Redirect] Unhandled authentication error:', error);
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
