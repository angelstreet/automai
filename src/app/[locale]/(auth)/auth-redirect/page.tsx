'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function AuthRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useParams();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    // Prevent multiple redirects
    if (isRedirecting) return;

    const handleRedirect = async () => {
      setIsRedirecting(true);
      try {
        // If we have a session, redirect to the appropriate dashboard
        if (session?.user) {
          // Use tenant name or default to plan-based name
          const tenant = (session.user as any).tenantName || 'trial';
          console.log('Session data:', {
            userId: session.user.id,
            email: session.user.email,
            tenant,
            accessToken: session.accessToken ? 'present' : 'missing',
          });
          router.replace(`/${locale}/${tenant}/dashboard`);
        } else {
          // No session means authentication failed
          console.error('No session available');
          router.replace(`/${locale}/login?error=Authentication failed - no session`);
        }
      } catch (error) {
        console.error('Error during redirect:', error);
        router.replace(
          `/${locale}/login?error=${encodeURIComponent('Failed to authenticate: ' + error)}`,
        );
      }
    };

    handleRedirect();
  }, [locale, router, isRedirecting, session]);

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </div>
    </div>
  );
}
