'use client';

import { useEffect } from 'react';

// Create a root-level redirect page that handles the issue with Supabase auth redirecting to /auth-redirect
// This is a fallback solution for when the redirect URL doesn't include the locale
export default function RootAuthRedirect() {
  useEffect(() => {
    // Default to 'en' locale
    const locale = 'en';
    const hash = window.location.hash;
    const search = window.location.search;
    const origin = window.location.origin;
    
    console.log('ROOT AUTH-REDIRECT: Handling OAuth callback');
    console.log('ROOT AUTH-REDIRECT: URL:', window.location.href);
    
    // If we have an explicit code parameter, we're using authorization code flow
    // Supabase needs to see this at the right URL
    if (search && search.includes('code=')) {
      console.log('ROOT AUTH-REDIRECT: Authorization code detected!');
      console.log('ROOT AUTH-REDIRECT: Redirecting to localized version with code parameter');
      window.location.replace(`${origin}/${locale}/auth-redirect${search}`);
      return;
    }
    
    // Log information about the token without exposing sensitive data
    if (hash && hash.includes('access_token=')) {
      console.log('ROOT AUTH-REDIRECT: Found access token in hash fragment');
      
      try {
        // Parse the hash to extract token information
        const tokens = Object.fromEntries(
          hash.substring(1).split('&').map(param => {
            const [key, value] = param.split('=');
            return [key, decodeURIComponent(value)];
          })
        );
        
        // Log non-sensitive parts of the token for debugging
        console.log('ROOT AUTH-REDIRECT: Token analysis:', {
          token_type: tokens.token_type,
          expires_in: tokens.expires_in,
          expires_at: tokens.expires_at,
          has_access_token: !!tokens.access_token,
          has_refresh_token: !!tokens.refresh_token,
          has_provider_token: !!tokens.provider_token,
        });
        
        // Store the parsed tokens in sessionStorage so we can recover them if needed
        if (typeof sessionStorage !== 'undefined') {
          try {
            // Save the full hash
            sessionStorage.setItem('auth_redirect_hash', hash);
            
            // Also save individual tokens as separate items for easier retrieval
            sessionStorage.setItem('supabase.auth.token_type', tokens.token_type || '');
            sessionStorage.setItem('supabase.auth.access_token', tokens.access_token || '');
            sessionStorage.setItem('supabase.auth.refresh_token', tokens.refresh_token || '');
            sessionStorage.setItem('supabase.auth.expires_at', tokens.expires_at || '');
            sessionStorage.setItem('supabase.auth.provider_token', tokens.provider_token || '');
            
            console.log('ROOT AUTH-REDIRECT: Saved tokens to sessionStorage for recovery');
          } catch (e) {
            console.error('ROOT AUTH-REDIRECT: Failed to save tokens to sessionStorage:', e);
          }
        }
      } catch (e) {
        console.error('ROOT AUTH-REDIRECT: Error parsing hash:', e);
      }
    }
    
    // Create a direct URL to the localized auth-redirect page
    const redirectUrl = `${origin}/${locale}/auth-redirect${search}${hash}`;
    console.log('ROOT AUTH-REDIRECT: Redirecting to:', redirectUrl);
    
    // Perform a hard redirect to the localized version
    window.location.replace(redirectUrl);
  }, []);

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
        <h2 className="text-xl font-semibold">Redirecting...</h2>
        <p className="text-sm text-muted-foreground">
          Setting up your authentication...
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}