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

// Simplified cookie setting function
const setAuthCookies = (session: Session): boolean => {
  try {
    if (!session?.user) return false;
    
    // Determine domain based on hostname
    const hostname = window.location.hostname;
    let cookieDomain = '';
    
    if (hostname.includes('.app.github.dev')) cookieDomain = '.app.github.dev';
    else if (hostname.includes('.vercel.app')) cookieDomain = '.vercel.app';
    
    // Simple cookie options
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = [
      'path=/',
      'max-age=604800',
      'SameSite=Lax',
      isProduction ? 'Secure' : '',
      cookieDomain ? `domain=${cookieDomain}` : ''
    ].filter(Boolean).join('; ');
    
    // Set essential cookies
    document.cookie = `sb-access-token=${session.access_token}; ${cookieOptions}`;
    document.cookie = `sb-refresh-token=${session.refresh_token}; ${cookieOptions}`;
    document.cookie = `user-session=${session.user.id}; ${cookieOptions}`;
    
    console.log('[Auth-Redirect] Cookies set');
    
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
        
        // Detect environment
        const isCodespace = window.location.hostname.includes('.app.github.dev');
        console.log('[Auth-Redirect] Is Codespace environment:', isCodespace);
        
        // Let Supabase handle session extraction based on URL parameters
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('[Auth-Debug] Session state:', {
          hasSession: !!session,
          sessionUser: session?.user?.email,
          error: error?.message,
          hasAccessToken: session?.access_token ? true : false
        });

        if (session?.user) {
          // Set cookies
          try {
            setAuthCookies(session);
          } catch (cookieError) {
            console.warn('[Auth] Cookie setup failed:', cookieError);
          }
          
          // Redirect to dashboard with tenant from user metadata or default
          setStatus('success');
          const tenant = session.user.user_metadata?.tenant_name || 'trial';
          
          // Get current origin for dynamic redirect
          const origin = window.location.origin;
          const dashboardUrl = `/${locale}/${tenant}/dashboard`;
          
          console.log('[Auth-Redirect] Redirecting to dashboard:', dashboardUrl);
          router.push(dashboardUrl);
          return;
        }

        // Only reach here if no session
        setStatus('error');
        setErrorMessage('No valid session found');
        
        // After delay, redirect to login
        setTimeout(() => {
          router.push(`/${locale}/login`);
        }, 2000);
      } catch (error) {
        console.error('[Auth] Fatal error:', error);
        setStatus('error');
        
        // After delay, redirect to login
        setTimeout(() => {
          router.push(`/${locale}/login`);
        }, 2000);
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
