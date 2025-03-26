'use client';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { exchangeCodeForSession } from '@/app/actions/auth';
import { useUser } from '@/context/UserContext';
import { User } from '@/types/user';

// Add error boundary component
function ErrorFallback({ error, locale }: { error: Error; locale: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 text-foreground p-6 bg-red-50 dark:bg-red-900/20 rounded-lg max-w-md">
        <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">Authentication Error</h2>
        <p className="text-sm">{error.message}</p>
        <div className="pt-4">
          <a
            href={`/${locale}/login`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Return to Login
          </a>
        </div>
      </div>
    </div>
  );
}

// Loading component to show while processing
function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-foreground">Completing authentication...</p>
      </div>
    </div>
  );
}

export default function AuthRedirectPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<Error | null>(null);
  const [isProcessing, setIsProcessing] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [loading, setLoading] = useState(false);
  const locale = params.locale as string;
  const { refreshUser } = useUser();

  // Get search params
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Handle the authentication process
  useEffect(() => {
    // Skip if we've already processed or there's no code
    if (hasRedirected || !code) {
      setIsProcessing(false);
      return;
    }

    // Check if this code was already processed (NextJS dev mode double rendering fix)
    if (typeof window !== 'undefined') {
      const processedCodes = localStorage.getItem('processed_auth_codes');
      const codesSet = processedCodes ? new Set(JSON.parse(processedCodes)) : new Set();

      if (codesSet.has(code)) {
        console.log('🔐 AUTH REDIRECT: Skipping duplicate code processing');
        setIsProcessing(false);
        // Check if user is already authenticated and redirect if needed
        refreshUser().then((user: User | null) => {
          if (user) {
            const tenantName = user.tenant_name || 'trial';
            router.push(`/${locale}/${tenantName}/dashboard`);
          }
        });
        return;
      }

      // Add code to processed set
      codesSet.add(code);
      localStorage.setItem('processed_auth_codes', JSON.stringify([...codesSet]));

      // Set cleanup to avoid memory leaks (codes expire quickly anyway)
      setTimeout(() => {
        const oldCodes = localStorage.getItem('processed_auth_codes');
        if (oldCodes) {
          const codesSet = new Set(JSON.parse(oldCodes));
          codesSet.delete(code);
          localStorage.setItem('processed_auth_codes', JSON.stringify([...codesSet]));
        }
      }, 60000); // Clear after 1 minute
    }

    async function processAuth() {
      try {
        // If there's an error in the URL, show it
        if (errorParam) {
          setAuthError(new Error(errorDescription || errorParam));
          setIsProcessing(false);
          return;
        }

        // Get the full URL for the auth callback
        const fullUrl = typeof window !== 'undefined' ? window.location.href : '';
        setLoading(true);
        const result = await exchangeCodeForSession(fullUrl);

        if (!result.success) {
          setAuthError(new Error(result.error || 'Authentication failed'));
          setIsProcessing(false);
          return;
        }

        // After successful auth, refresh user data
        await refreshUser();

        // Add delay to ensure session is stable
        await new Promise((resolve) => setTimeout(resolve, 1200));

        // Handle redirect using Next.js router
        if (result.redirectUrl) {
          setHasRedirected(true);
          router.push(result.redirectUrl);
        }
      } catch (err) {
        console.error('Error in auth process:', err);
        setAuthError(err instanceof Error ? err : new Error('Authentication failed'));
        setIsProcessing(false);
      }
    }

    processAuth();
  }, [code, errorParam, errorDescription, hasRedirected, router, locale, refreshUser]);

  // Show error if there is one
  if (authError) {
    return <ErrorFallback error={authError} locale={locale} />;
  }

  // Show loading state while processing
  if (isProcessing || loading) {
    return <LoadingState />;
  }

  // Fallback for any other case - should rarely be seen as the action should redirect
  return <LoadingState />;
}
