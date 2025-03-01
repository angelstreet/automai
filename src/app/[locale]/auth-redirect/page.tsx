'use client';

import { useRouter, useParams } from 'next/navigation';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function AuthRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const locale = params?.locale as string || 'en';
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { data: session, status } = useSession();

  // Debug logging on initial render
  console.log('Auth redirect page loaded (without route group):', {
    params,
    locale,
    sessionStatus: status,
    hasSession: !!session,
    userData: session?.user ? {
      id: session.user.id,
      email: session.user.email,
      tenant: session.user.tenantName || 'trial',
    } : null,
    url: typeof window !== 'undefined' ? window.location.href : '',
  });

  useEffect(() => {
    // Debug logging on each effect run
    console.log('Auth redirect effect running:', {
      isRedirecting,
      sessionStatus: status,
      hasSession: !!session,
    });

    // Prevent multiple redirects
    if (isRedirecting) return;

    // Wait for session to be loaded
    if (status === 'loading') return;

    const handleRedirect = async () => {
      setIsRedirecting(true);
      try {
        // If we have a session, redirect to the appropriate dashboard
        if (session?.user) {
          // Use tenant name or default to plan-based name
          const tenant = session.user.tenantName || 'trial';
          console.log('Session data:', {
            userId: session.user.id,
            email: session.user.email,
            tenant,
            accessToken: session.accessToken ? 'present' : 'missing',
          });
          
          // Get the current origin
          const origin = window.location.origin;
          const redirectUrl = `${origin}/${locale}/${tenant}/dashboard`;
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
  }, [locale, router, isRedirecting, session, status]);

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
          {status === 'loading' ? 'Loading session...' : 
           session ? 'Session found, redirecting...' : 
           'No session found, redirecting to login...'}
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
} 