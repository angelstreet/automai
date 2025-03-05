'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import supabaseAuth from '@/lib/supabase-auth';

export default function AuthRedirectFallback() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Auth-redirect page loaded');

    // Function to check Supabase session and redirect
    async function checkSessionAndRedirect() {
      try {
        // Get current session from Supabase
        const { data, error } = await supabaseAuth.getSession();
        
        // Default locale
        const locale = 'en';

        if (error) {
          console.error('Session error:', error);
          setError('Failed to get session');
          window.location.href = `/${locale}/login?error=Authentication failed - ${error.message}`;
          return;
        }

        if (data?.session) {
          // Try to get user data from database to determine tenant
          try {
            // For now, use default tenant
            const tenant = 'trial';
            console.log('Session found, redirecting to dashboard');
            window.location.href = `/${locale}/${tenant}/dashboard`;
          } catch (dbError) {
            console.error('Database error:', dbError);
            // Still redirect to default dashboard on DB error
            window.location.href = `/${locale}/trial/dashboard`;
          }
        } else {
          console.log('No session found, redirecting to login');
          window.location.href = `/${locale}/login?error=Authentication failed - no session`;
        }
      } catch (e) {
        console.error('Auth redirect error:', e);
        setError('Authentication error');
        setIsLoading(false);
      }
    }
    
    checkSessionAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold">Setting up your workspace...</h2>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-sm text-gray-500">Redirecting you to the right place...</p>
      </div>
    </div>
  );
}
