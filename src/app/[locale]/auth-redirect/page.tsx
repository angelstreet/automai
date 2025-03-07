'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/lib/supabase';

export default function AuthRedirectPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log('=== AUTH REDIRECT PAGE LOADED ===');
    console.log('URL:', window.location.href);
    
    const handleAuth = async () => {
      try {
        const supabase = createBrowserSupabase();
        
        // Let Supabase handle the session extraction from URL (it does this automatically)
        // This works for both hash fragments (#access_token=) and query parameters (?code=)
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error.message);
          setStatus('error');
          setErrorMessage(error.message);
          return;
        }
        
        if (data?.session) {
          console.log('Session found:', {
            email: data.session.user.email,
            id: data.session.user.id
          });
          
          // Extract tenant ID or use default
          const tenantId = data.session.user.user_metadata?.tenantId || 'trial';
          
          // If we need to update user metadata, do it here
          if (!data.session.user.user_metadata?.tenantId) {
            try {
              await supabase.auth.updateUser({
                data: {
                  role: 'user',
                  tenantId: 'trial',
                  tenantName: 'trial',
                }
              });
              console.log('User metadata updated with default tenant');
            } catch (e) {
              console.error('Failed to update user metadata:', e);
              // Continue anyway since this isn't critical
            }
          }
          
          // Redirect to dashboard
          setStatus('success');
          const dashboardUrl = `/${locale}/${tenantId}/dashboard`;
          console.log('Redirecting to dashboard:', dashboardUrl);
          
          // Small delay to ensure UI updates before redirect
          setTimeout(() => {
            window.location.href = dashboardUrl;
          }, 500);
          
        } else {
          console.log('No session found, redirecting to login');
          setStatus('error');
          setErrorMessage('Authentication failed - no session was created');
          
          // Redirect to login after a brief delay
          setTimeout(() => {
            window.location.href = `/${locale}/login?error=${encodeURIComponent('Authentication failed - no session was created')}`;
          }, 1000);
        }
      } catch (error: any) {
        console.error('Unexpected error during authentication:', error);
        setStatus('error');
        setErrorMessage(error.message || 'An unexpected error occurred');
        
        // Redirect to login after a brief delay
        setTimeout(() => {
          window.location.href = `/${locale}/login?error=${encodeURIComponent(error.message || 'An unexpected error occurred')}`;
        }, 1000);
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
