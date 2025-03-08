import { createClient } from '@/lib/supabase';

import { redirect } from 'next/navigation';

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
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <h2 className="text-2xl font-bold">Authenticating...</h2>
        </div>
        <p>Please wait while we complete your authentication.</p>
      </div>
    </div>
  );
}

export default async function AuthRedirectPage({
  params,
  searchParams,
}: {
  params: { locale: string };
  searchParams: { code?: string; error?: string; error_description?: string };
}) {
  // Properly await params and searchParams
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  
  // Default locale if undefined
  const locale = resolvedParams?.locale || 'en';
  
  try {
    // Safely access search params
    const code = resolvedSearchParams?.code;
    const error = resolvedSearchParams?.error;
    const errorDescription = resolvedSearchParams?.error_description;
    
    // Log the search params (debug)
    console.log('Auth redirect page searchParams:', {
      code: code ? `${code.substring(0, 6)}...` : undefined,
      error,
      errorDescription
    });
    
    // Check for errors in search params
    if (error) {
      console.error('OAuth error in redirect:', {
        error,
        description: errorDescription
      });
      redirect(`/${locale}/login?error=${encodeURIComponent(errorDescription || error)}`);
      // Return loading state to prevent rendering issues while redirect happens
      return <LoadingState />;
    }
    
    // If no code is provided, redirect to login
    if (!code) {
      console.error('No code provided in auth redirect');
      redirect(`/${locale}/login?error=No authentication code provided`);
      // Return loading state to prevent rendering issues while redirect happens
      return <LoadingState />;
    }
    
    // Create Supabase client
    const supabase = await createClient();
    
    // Check for existing session first
    const { data: sessionData } = await supabase.auth.getSession();
    
    // If we already have a session, redirect to dashboard
    if (sessionData?.session) {
      console.log('User already has a valid session');
      const tenant = sessionData.session.user.user_metadata?.tenant_name || 'trial';
      const dashboardUrl = `/${locale}/${tenant}/dashboard`;
      redirect(dashboardUrl);
      return <LoadingState />;
    }
    
    // No need to exchange the code - the middleware will handle this automatically
    // Just redirect to the dashboard and let the middleware handle the session
    console.log('Redirecting to dashboard, middleware will handle session');
    redirect(`/${locale}/trial/dashboard`);
    return <LoadingState />;
  } catch (error) {
    // Don't catch NEXT_REDIRECT errors
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error; // Rethrow to allow the redirect to happen
    }
    
    console.error('Unexpected error in auth-redirect:', error);
    
    // Return error component instead of redirecting to prevent redirect loops
    return <ErrorFallback error={error instanceof Error ? error : new Error('Unknown authentication error')} locale={locale} />;
  }
  
  // This should never be reached, but provide a fallback UI just in case
  return <LoadingState />;
}
