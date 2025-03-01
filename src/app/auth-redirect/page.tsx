'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useSession } from 'next-auth/react';

export default function AuthRedirectFallback() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log('Root auth-redirect fallback loaded');
    
    // Wait for session to be loaded
    if (status === 'loading') return;

    // Default locale
    const locale = 'en';

    if (session?.user) {
      // Use tenant name or default to trial
      const tenant = session.user.tenantName || 'trial';
      console.log('Session found, redirecting to dashboard');
      window.location.href = `/${locale}/${tenant}/dashboard`;
    } else {
      console.log('No session found, redirecting to login');
      window.location.href = `/${locale}/login?error=Authentication failed - no session`;
    }
  }, [router, session, status]);

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