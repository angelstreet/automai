'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '@/context/UserContext';
import supabaseAuth from '@/lib/supabase-auth';
import { createBrowserSupabase } from '@/lib/supabase';

export default function AuthRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');
  const { user } = useUser();

  // Handle authentication and token processing
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('=== AUTH REDIRECT PAGE LOADED ===');
    console.log('URL:', window.location.href);
    console.log('Hash present:', !!window.location.hash);
    console.log('Search params:', window.location.search);
    
    const handleAuth = async () => {
      try {
        // Create a single Supabase client for all auth operations
        const supabase = createBrowserSupabase();
        
        // 1. First check if we already have a session
        console.log('Checking for existing session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error getting session:', sessionError);
        }
        
        if (sessionData?.session) {
          console.log('Session already exists!');
          setSession(sessionData.session);
          setStatus('authenticated');
          return;
        }
        
        // 2. Check for code parameter (authorization code flow)
        if (window.location.search.includes('code=')) {
          console.log('Authorization code detected in URL params');
          
          // Let Supabase process the authorization code
          try {
            // Wait briefly for any background processes to complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Check if the session was established
            const { data, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('Error after code processing:', error);
            }
            
            if (data?.session) {
              console.log('Session established after code processing!');
              setSession(data.session);
              setStatus('authenticated');
              return;
            }
          } catch (e) {
            console.error('Error handling authorization code:', e);
          }
        }
        
        // 3. Check for access token in URL hash (implicit flow)
        if (window.location.hash && window.location.hash.includes('access_token=')) {
          console.log('Access token detected in URL hash');
          
          // Parse the hash
          const params = Object.fromEntries(
            window.location.hash.substring(1).split('&').map(param => {
              const [key, value] = param.split('=');
              return [key, decodeURIComponent(value)];
            })
          );
          
          console.log('Token info:', {
            token_type: params.token_type,
            has_access_token: !!params.access_token,
            has_refresh_token: !!params.refresh_token,
            provider_token_prefix: params.provider_token ? params.provider_token.substring(0, 5) : 'none'
          });
          
          // Try to exchange the token directly
          if (params.access_token) {
            try {
              console.log('Attempting to exchange token for session...');
              const { data, error } = await supabase.auth.setSession({
                access_token: params.access_token,
                refresh_token: params.refresh_token || '',
              });
              
              if (error) {
                console.error('Error setting session:', error);
              } else if (data?.session) {
                console.log('Successfully established session from token!');
                setSession(data.session);
                setStatus('authenticated');
                return;
              }
            } catch (e) {
              console.error('Error during token exchange:', e);
            }
          }
          
          // Try provider token if available
          if (params.provider_token) {
            // Determine provider type based on token format
            const providerType = params.provider_token.startsWith('gho_') ? 
              'github' : 
              params.provider_token.startsWith('ya29.') ? 
                'google' : 
                'unknown';
                
            console.log(`Provider token detected for ${providerType}`);
            
            // Handle GitHub token
            if (providerType === 'github') {
              try {
                console.log('Verifying GitHub provider token...');
                const githubResponse = await fetch('https://api.github.com/user', {
                  headers: {
                    'Authorization': `token ${params.provider_token}`,
                    'Accept': 'application/vnd.github.v3+json'
                  }
                });
                
                if (githubResponse.ok) {
                  const userData = await githubResponse.json();
                  console.log('GitHub user verified:', userData.login);
                  
                  // Store verified user info
                  if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('github_verified_user', JSON.stringify({
                      login: userData.login,
                      id: userData.id,
                      email: userData.email,
                    }));
                  }
                  
                  // Try one more session check
                  const { data } = await supabase.auth.getSession();
                  if (data?.session) {
                    console.log('Session found after GitHub verification!');
                    setSession(data.session);
                    setStatus('authenticated');
                    return;
                  }
                } else {
                  console.error('GitHub API error:', await githubResponse.text());
                }
              } catch (e) {
                console.error('Error verifying GitHub token:', e);
              }
            }
            
            // Handle Google token
            if (providerType === 'google') {
              try {
                console.log('Verifying Google provider token...');
                const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: {
                    'Authorization': `Bearer ${params.provider_token}`
                  }
                });
                
                if (googleResponse.ok) {
                  const userData = await googleResponse.json();
                  console.log('Google user verified:', userData.email);
                  
                  // Store verified user info
                  if (typeof localStorage !== 'undefined') {
                    localStorage.setItem('google_verified_user', JSON.stringify({
                      email: userData.email,
                      name: userData.name,
                      picture: userData.picture,
                    }));
                  }
                  
                  // Try one more session check
                  const { data } = await supabase.auth.getSession();
                  if (data?.session) {
                    console.log('Session found after Google verification!');
                    setSession(data.session);
                    setStatus('authenticated');
                    return;
                  }
                } else {
                  console.error('Google API error:', await googleResponse.text());
                }
              } catch (e) {
                console.error('Error verifying Google token:', e);
              }
            }
            
            // Generic provider handling if token type wasn't recognized
            if (providerType === 'unknown') {
              console.log('Unknown provider token type, attempting generic session check');
              
              // Try a session check anyway
              const { data } = await supabase.auth.getSession();
              if (data?.session) {
                console.log('Session found with unknown provider token!');
                setSession(data.session);
                setStatus('authenticated');
                return;
              }
            }
          }
        }
        
        // 4. No session established, set status accordingly
        console.log('Authentication unsuccessful');
        setStatus('unauthenticated');
        
      } catch (error) {
        console.error('Authentication error:', error);
        setStatus('unauthenticated');
      }
    };
    
    handleAuth();
  }, []);

  // Handle redirect based on authentication status
  useEffect(() => {
    // Debug logging
    console.log('Auth status:', status);
    console.log('Session exists:', !!session);
    console.log('User context:', user ? { id: user.id, email: user.email } : 'no user');
    
    // Prevent multiple redirects
    if (isRedirecting) return;
    
    // Wait for authentication to complete
    if (status === 'loading') return;
    
    const handleRedirect = async () => {
      setIsRedirecting(true);
      
      try {
        // If authenticated, redirect to dashboard
        if (session?.user) {
          // Extract tenant info
          const tenantId = session.user.user_metadata?.tenantId || user?.tenantId || 'trial';
          
          console.log('Redirecting to dashboard with tenant:', tenantId);
          
          // Add default tenant info if needed
          if (!session.user.user_metadata?.tenantId) {
            console.log('Setting up default tenant info...');
            try {
              await supabaseAuth.updateUser({
                data: {
                  tenantId: 'trial',
                  tenantName: 'Trial',
                  role: 'user',
                }
              });
              console.log('User metadata updated');
            } catch (e) {
              console.error('Error updating user metadata:', e);
            }
          }
          
          // Redirect to dashboard
          const origin = window.location.origin;
          const dashboardUrl = `${origin}/${locale}/${tenantId}/dashboard`;
          
          console.log('Redirecting to:', dashboardUrl);
          window.location.href = dashboardUrl;
        } else {
          // If not authenticated, redirect to login
          console.error('Authentication failed - no session');
          
          const origin = window.location.origin;
          const loginUrl = `${origin}/${locale}/login?error=Authentication failed - no session`;
          
          console.log('Redirecting to login:', loginUrl);
          window.location.href = loginUrl;
        }
      } catch (error) {
        console.error('Error during redirect:', error);
        
        const origin = window.location.origin;
        const errorUrl = `${origin}/${locale}/login?error=${encodeURIComponent('Redirect error: ' + error)}`;
        
        window.location.href = errorUrl;
      }
    };
    
    handleRedirect();
  }, [locale, router, isRedirecting, session, status, user]);

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
          {status === 'loading'
            ? 'Loading session...'
            : status === 'authenticated'
              ? 'Session found, redirecting...'
              : 'No session found, redirecting to login...'}
        </p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}