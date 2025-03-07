'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient, createSessionFromUrl } from '@/utils/supabase/client';
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
      cookieDomain = '.app.github.dev';
    } else if (hostname.includes('vercel.app')) {
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
    
    console.log('[Auth-Redirect] Page loaded:', window.location.href.split('?')[0]);
    
    const handleAuth = async () => {
      try {
        const supabase = createClient();
        
        // Extract hash params and create session if they exist
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const access_token = hashParams.get('access_token');
        
        if (access_token) {
          // Use the helper to set session from URL hash
          await createSessionFromUrl(window.location.href);
        }

        // Now check session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        console.log('[Auth-Debug] Session state:', {
          hasSession: !!session,
          sessionUser: session?.user?.email,
          error: error?.message,
          hasAccessToken: !!access_token
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
