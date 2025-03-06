'use client';

import { useEffect } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';

// Create a root-level redirect page that handles the issue with Supabase auth redirecting to /auth-redirect
export default function RootAuthRedirect() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Default to 'en' locale
    const locale = 'en';
    const hash = window.location.hash;
    const search = window.location.search;
    const origin = window.location.origin;
    
    console.log('ROOT AUTH-REDIRECT: Handling OAuth callback');
    console.log('ROOT AUTH-REDIRECT: URL:', window.location.href);
    console.log('ROOT AUTH-REDIRECT: Hash present:', !!hash);
    console.log('ROOT AUTH-REDIRECT: Has access token:', hash && hash.includes('access_token='));
    
    // Try to validate and use the token directly here before redirecting
    const tryDirectAuth = async () => {
      try {
        // Check if we have a token in the URL - either in hash or search params
        if (hash && hash.includes('access_token=')) {
          console.log('ROOT AUTH-REDIRECT: Access token found in hash, attempting direct authentication');
          
          // Create Supabase client with special configuration for GitHub Codespaces
          const supabase = createBrowserSupabase();
          
          // Use helper to create session from URL with token
          // Type assertion needed since we added this method dynamically
          const { data, error } = await (supabase.auth as any).createSessionFromUrl(window.location.href);
          
          if (error) {
            console.error('ROOT AUTH-REDIRECT: Error creating session:', {
              message: error.message, 
              name: error.name,
              stack: error.stack
            });
            
            // Try getting existing session as fallback
            const { data: existingData, error: existingError } = await supabase.auth.getSession();
            if (!existingError && existingData?.session) {
              console.log('ROOT AUTH-REDIRECT: Found existing session, using that instead');
              
              // We successfully authenticated, now redirect to dashboard
              const tenantId = existingData.session.user.user_metadata?.tenantId || 'trial';
              const dashboardUrl = `${origin}/${locale}/${tenantId}/dashboard`;
              
              console.log('ROOT AUTH-REDIRECT: Authenticated with existing session, redirecting to dashboard:', dashboardUrl);
              window.location.href = dashboardUrl;
              return true;
            }
          } else if (data?.session) {
            console.log('ROOT AUTH-REDIRECT: Session created successfully!');
            console.log('ROOT AUTH-REDIRECT: User:', data.session.user.email);
            
            // We successfully authenticated, now redirect to dashboard
            const tenantId = data.session.user.user_metadata?.tenantId || 'trial';
            const dashboardUrl = `${origin}/${locale}/${tenantId}/dashboard`;
            
            // Make sure we persist the token to localStorage as well to ensure the session persists
            try {
              // Store a local marker of successful authentication
              localStorage.setItem('supabase.auth.token', JSON.stringify({
                timestamp: new Date().toISOString(),
                userId: data.session.user.id,
                email: data.session.user.email
              }));
            } catch (e) {
              console.error('Failed to write to localStorage:', e);
            }
            
            console.log('ROOT AUTH-REDIRECT: Authenticated, redirecting to dashboard:', dashboardUrl);
            // Use window.location.replace to preserve history state
            window.location.replace(dashboardUrl);
            return true;
          }
        } else {
          console.log('ROOT AUTH-REDIRECT: No access token found in URL hash');
          
          // Try to get session directly
          const supabase = createBrowserSupabase();
          const { data, error } = await supabase.auth.getSession();
          
          if (!error && data?.session) {
            console.log('ROOT AUTH-REDIRECT: Found existing session without token in URL');
            
            // We have a session, redirect to dashboard
            const tenantId = data.session.user.user_metadata?.tenantId || 'trial';
            const dashboardUrl = `${origin}/${locale}/${tenantId}/dashboard`;
            
            console.log('ROOT AUTH-REDIRECT: Authenticated with existing session, redirecting to dashboard:', dashboardUrl);
            window.location.href = dashboardUrl;
            return true;
          }
        }
      } catch (e) {
        console.error('ROOT AUTH-REDIRECT: Unexpected error during authentication:', e);
      }
      return false;
    };
    
    // Try direct auth first, if it fails, redirect to the localized auth-redirect
    tryDirectAuth().then(succeeded => {
      if (!succeeded) {
        // Direct auth failed or wasn't attempted, redirect to localized version
        const redirectUrl = `${origin}/${locale}/auth-redirect${search}${hash}`;
        console.log('ROOT AUTH-REDIRECT: Redirecting to localized auth page:', redirectUrl);
        window.location.replace(redirectUrl);
      }
    });
  }, []);

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
        <h2 className="text-xl font-semibold text-foreground">Processing authentication...</h2>
        <p className="text-sm text-muted-foreground">
          Please wait while we set up your workspace
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}