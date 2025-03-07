'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Session } from '@/utils/supabase/index';

// Simplified cookie setting function
const setAuthCookies = (session: Session): boolean => {
  try {
    if (!session?.user) return false;
    
    // Simple cookie options
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      'path=/',
      'max-age=604800',
      'SameSite=Lax',
      isProduction ? 'Secure' : ''
    ].filter(Boolean).join('; ');
    
    // Set essential cookies
    document.cookie = `sb-access-token=${session.access_token}; ${cookieOptions}`;
    document.cookie = `sb-refresh-token=${session.refresh_token}; ${cookieOptions}`;
    document.cookie = `user-session=${session.user.id}; ${cookieOptions}`;
    
    console.log('[Auth-Redirect] Cookies set successfully');
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
    
    const handleAuth = async () => {
      try {
        const supabase = createClient();
        
        // Get code from URL if present
        const code = new URLSearchParams(window.location.search).get('code');
        
        if (code) {
          console.log('[Auth-Redirect] Found authorization code, exchanging for session');
          
          try {
            // Exchange code for session
            const { data, error } = await supabase.auth.exchangeCodeForSession(code);
            
            if (error) {
              console.error('[Auth-Redirect] Error exchanging code:', error);
              setStatus('error');
              setErrorMessage(error.message);
              setTimeout(() => router.push(`/${locale}/login`), 2000);
              return;
            }
            
            if (data?.session) {
              console.log('[Auth-Redirect] Successfully obtained session');
              
              // Set cookies
              setAuthCookies(data.session);
              
              // Redirect to dashboard
              setStatus('success');
              const tenant = data.session.user.user_metadata?.tenant_name || 'trial';
              const dashboardUrl = `/${locale}/${tenant}/dashboard`;
              
              console.log('[Auth-Redirect] Redirecting to dashboard:', dashboardUrl);
              router.push(dashboardUrl);
              return;
            }
          } catch (e) {
            console.error('[Auth-Redirect] Exception during code exchange:', e);
          }
        }
        
        // Fallback to checking for existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log('[Auth-Redirect] Found existing session');
          setAuthCookies(session);
          setStatus('success');
          
          const tenant = session.user.user_metadata?.tenant_name || 'trial';
          const dashboardUrl = `/${locale}/${tenant}/dashboard`;
          
          console.log('[Auth-Redirect] Redirecting to dashboard:', dashboardUrl);
          router.push(dashboardUrl);
          return;
        }
        
        // No session found
        console.log('[Auth-Redirect] No session found');
        setStatus('error');
        setErrorMessage('Authentication failed. No session found.');
        setTimeout(() => router.push(`/${locale}/login`), 2000);
      } catch (error) {
        console.error('[Auth-Redirect] Fatal error:', error);
        setStatus('error');
        setErrorMessage('An unexpected error occurred');
        setTimeout(() => router.push(`/${locale}/login`), 2000);
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
