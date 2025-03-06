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

  // Handle authentication from URL parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    console.log('=== AUTH REDIRECT PAGE LOADED ===');
    console.log('URL:', window.location.href);
    console.log('Hash present:', !!window.location.hash);
    console.log('Has access token:', window.location.hash && window.location.hash.includes('access_token='));
    console.log('Search params:', window.location.search);
    
    const handleAuth = async () => {
      try {
        // Create Supabase client with special configuration for GitHub Codespaces
        const supabase = createBrowserSupabase();
        
        // Try to extract and use the token directly from the URL
        if (window.location.hash && window.location.hash.includes('access_token=')) {
          console.log('Access token found in URL hash, using it directly');
          
          // Use the special helper method to create a session from the URL
          // Type assertion needed since we added this method dynamically
          const { data, error } = await (supabase.auth as any).createSessionFromUrl(window.location.href);
          
          if (error) {
            console.error('Error creating session from URL:', {
              errorMessage: error.message,
              errorName: error.name,
              errorType: typeof error,
              errorStack: error.stack ? error.stack.split('\n')[0] : 'No stack',
              timestamp: new Date().toISOString()
            });
            
            // Try to recover with existing session
            console.log('Trying to recover with existing session...');
            const { data: existingData, error: existingError } = await supabase.auth.getSession();
            
            if (!existingError && existingData?.session) {
              console.log('Recovered using existing session:', existingData.session.user.email);
              setSession(existingData.session);
              setStatus('authenticated');
              return;
            } else {
              console.error('No existing session found for recovery');
              setStatus('unauthenticated');
            }
          } else if (data?.session) {
            console.log('Session successfully created from URL!');
            console.log('User:', data.session.user.email);
            setSession(data.session);
            setStatus('authenticated');
            return;
          }
        } else {
          console.log('No access token in URL hash, checking existing session');
        }
        
        // No hash token or failed to create session from it
        // Try to get existing session
        console.log('Checking for existing session...');
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', {
            errorMessage: error.message,
            errorType: typeof error
          });
          setStatus('unauthenticated');
        } else if (data?.session) {
          console.log('Existing session found:', data.session.user.email);
          setSession(data.session);
          setStatus('authenticated');
        } else {
          console.log('No session found');
          
          // One last attempt - try processSessionFromUrl method
          try {
            console.log('Trying processSessionFromUrl as last resort');
            const { data: processData, error: processError } = await supabaseAuth.processSessionFromUrl();
            
            if (processError) {
              console.error('Process session error:', processError);
              setStatus('unauthenticated');
            } else if (processData?.session) {
              console.log('Process session succeeded:', processData.session.user.email);
              setSession(processData.session);
              setStatus('authenticated');
            } else {
              console.log('Process session found no session');
              setStatus('unauthenticated');
            }
          } catch (processE) {
            console.error('Process session unexpected error:', processE);
            setStatus('unauthenticated');
          }
        }
      } catch (e) {
        console.error('Authentication error:', e);
        setStatus('unauthenticated');
      }
    };
    
    handleAuth();
  }, []);

  // Handle redirection based on auth status
  useEffect(() => {
    console.log('Auth status:', status);
    console.log('Session exists:', !!session);
    
    // Prevent multiple redirects
    if (isRedirecting) return;
    
    // Wait for session to be loaded
    if (status === 'loading') return;
    
    const handleRedirect = async () => {
      setIsRedirecting(true);
      
      try {
        // If authenticated, redirect to dashboard
        if (session?.user) {
          // Extract tenant from user metadata or default to 'trial'
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
          
          // Make sure we persist the token to localStorage for additional safety
          try {
            // Store a local marker of successful authentication
            localStorage.setItem('supabase.auth.token', JSON.stringify({
              timestamp: new Date().toISOString(),
              userId: session.user.id,
              email: session.user.email
            }));
            console.log('Stored token info in localStorage');
          } catch (e) {
            console.error('Failed to write to localStorage:', e);
          }
          
          console.log('Redirecting to dashboard:', dashboardUrl);
          // Use window.location.replace to preserve history state
          window.location.replace(dashboardUrl);
        } else {
          // Not authenticated, redirect to login
          console.error('Authentication failed - no session');
          
          const origin = window.location.origin;
          const loginUrl = `${origin}/${locale}/login?error=Authentication failed - no session`;
          
          console.log('Redirecting to login:', loginUrl);
          window.location.href = loginUrl;
        }
      } catch (error) {
        console.error('Error during redirect:', error);
        const origin = window.location.origin;
        window.location.href = `${origin}/${locale}/login?error=${encodeURIComponent('Failed to authenticate: ' + error)}`;
      }
    };
    
    handleRedirect();
  }, [locale, router, isRedirecting, session, status, user]);

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