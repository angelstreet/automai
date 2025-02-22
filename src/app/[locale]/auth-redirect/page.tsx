'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function AuthRedirectPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale } = useParams();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Read the token once
  const token = searchParams.get('token');

  useEffect(() => {
    // Prevent multiple redirects
    if (isRedirecting) return;

    // If there's no token, redirect to login
    if (!token) {
      router.replace(`/${locale}/login?error=No authentication token`);
      return;
    }

    const handleRedirect = async () => {
      setIsRedirecting(true);
      try {
        // Sign in with the token
        const result = await signIn('credentials', {
          token,
          redirect: false,
        });

        if (result?.error) {
          throw new Error(result.error);
        }

        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);

        // Redirect to the dashboard
        router.replace(`/${locale}/trial/dashboard`);
      } catch (error) {
        console.error('Error during redirect:', error);
        router.replace(`/${locale}/login?error=Failed to authenticate`);
      }
    };

    handleRedirect();
  }, [token, locale, router, isRedirecting]);

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