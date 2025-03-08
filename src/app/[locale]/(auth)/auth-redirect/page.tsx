'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

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
  const { user, loading, error, refreshUser } = useAuth();
  const [authError, setAuthError] = useState<Error | null>(null);
  const locale = params.locale as string;
  
  // Get search params
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    async function handleAuthRedirect() {
      try {
        // If there's an error in the URL, show it
        if (errorParam) {
          setAuthError(new Error(errorDescription || errorParam));
          return;
        }

        // If no code is present, this isn't an auth callback
        if (!code) {
          setAuthError(new Error('No authentication code provided'));
          return;
        }

        // Refresh the user data to get the latest session
        await refreshUser();
        
        // If we have a user, redirect to their dashboard
        if (user) {
          const tenantId = user.user_metadata?.tenant_id || 'default';
          router.push(`/${locale}/${tenantId}/dashboard`);
        }
      } catch (err) {
        console.error('Error in auth redirect:', err);
        setAuthError(err instanceof Error ? err : new Error('Authentication failed'));
      }
    }

    if (!loading) {
      handleAuthRedirect();
    }
  }, [code, errorParam, errorDescription, loading, user, refreshUser, router, locale]);

  // Show error if there is one
  if (authError) {
    return <ErrorFallback error={authError} locale={locale} />;
  }

  // Show loading state while processing
  return <LoadingState />;
}
