'use client';

import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useUser } from '@/context/UserContext';
// No longer need to import supabase directly as we use UserContext

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, isLoading: isUserLoading, error: userError } = useUser();
  const isRedirecting = useRef(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const userErrorHandled = useRef(false);
  const authStateProcessed = useRef(false);

  // Properly handle params
  const locale = (params?.locale as string) || 'en';
  const currentTenant = params?.tenant as string;
  
  // Extract path parts for more precise path analysis
  const pathParts = pathname.split('/').filter(Boolean);

  // Add a listener for auth state changes from UserContext
  useEffect(() => {
    console.log('RouteGuard - Using auth state from UserContext');

    // Listen for auth state change events from UserContext
    const handleAuthStateChange = (event: any) => {
      const { isAuthenticated, isLoading, hasError } = event.detail;
      console.log('RouteGuard received auth state change:', {
        isAuthenticated,
        isLoading,
        hasError,
      });

      // We could implement additional logic here based on auth state changes
      // but we're using UserContext directly so this is mostly for logging/debugging
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('authStateChange', handleAuthStateChange);

      return () => {
        window.removeEventListener('authStateChange', handleAuthStateChange);
      };
    }
  }, []);

  useEffect(() => {
    // Reset redirecting flag when pathname changes
    isRedirecting.current = false;

    // Reset user error handled flag when pathname changes
    // But only if we're not on the login page anymore
    if (!pathname.includes('/login')) {
      userErrorHandled.current = false;
    }
    
    // Reset auth state processed flag when pathname changes
    authStateProcessed.current = false;
  }, [pathname]);

  useEffect(() => {
    // Log important state for debugging
    const info = {
      pathname,
      locale,
      currentTenant,
      isUserLoading,
      hasUser: !!user,
      userError,
      isRedirecting: isRedirecting.current,
      userErrorHandled: userErrorHandled.current,
      authStateProcessed: authStateProcessed.current
    };
    console.log('RouteGuard state:', info);
    setDebugInfo(info);
  }, [pathname, locale, currentTenant, isUserLoading, user, userError]);

  useEffect(() => {
    // Don't do anything while loading user data
    if (isUserLoading) {
      console.log('RouteGuard - User is loading, waiting...');
      return;
    }

    // Prevent multiple redirects
    if (isRedirecting.current) {
      console.log('RouteGuard - Already redirecting, skipping...');
      return;
    }
    
    // Prevent processing the same auth state multiple times
    if (authStateProcessed.current) {
      console.log('RouteGuard - Auth state already processed, skipping...');
      return;
    }
    
    // Mark that we've processed this auth state
    authStateProcessed.current = true;

    const handleRouting = async () => {
      console.log('RouteGuard - Handling routing:', {
        pathname,
        hasUser: !!user
      });

      // Handle OAuth errors
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const error = searchParams.get('error');
        if (error && !isRedirecting.current) {
          console.log('Redirecting due to OAuth error');
          isRedirecting.current = true;
          router.replace(`/${locale}/login?error=${error}`);
          return;
        }
      }

      // Only redirect if explicitly on the login or signup page, or root pages
      const shouldRedirectFromPublic = 
        user && 
        !isRedirecting.current && 
        (pathname.includes('/login') || 
         pathname.includes('/signup') || 
         pathname === `/${locale}` || 
         pathname === `/${locale}/`);
      
      if (shouldRedirectFromPublic) {
        const tenant = user.tenant_name || 'trial'; // Use user's tenant or default
        console.log(`Redirecting authenticated user to dashboard: /${locale}/${tenant}/dashboard`);
        isRedirecting.current = true;
        router.replace(`/${locale}/${tenant}/dashboard`);
        return;
      }

      // For protected routes with active tenant, we don't need to do any redirects
      // Only consider tenant mismatch if we're at a root path without a tenant
      if (user && pathParts.length <= 2) {
        const expectedTenant = user.tenant_name || 'trial'; // Default to trial if no tenant

        // Only redirect if we don't have a tenant in the path
        if (expectedTenant && !currentTenant && !isRedirecting.current) {
          console.log(`No tenant in path, redirecting to default tenant: ${expectedTenant}`);
          isRedirecting.current = true;
          router.replace(`/${locale}/${expectedTenant}/dashboard`);
        }
      }
    };

    // Only run routing logic if we have a definitive auth state (not loading)
    // and we're not already redirecting
    if (!isUserLoading && !isRedirecting.current) {
      handleRouting();
    }
  }, [pathname, locale, currentTenant, isUserLoading, user, router]);

  // Show loading state while checking auth
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Improved error handling - don't block the UI if we have a user error
  if (userError) {
    console.log('Auth warning (non-blocking):', userError, {
      hasUser: !!user,
      pathname,
    });

    // If UserContext has an error but we have some user data,
    // we'll still render the app to prevent blocking the UI
    if (user) {
      return <>{children}</>;
    }
  }

  // Show debug info only in development and if there's a critical error
  if (process.env.NODE_ENV === 'development' && debugInfo && userError && !user) {
    // Log the error but don't show the banner
    console.error('Critical Auth Error:', userError, debugInfo);

    // In development, display the error for debugging
    return (
      <>
        {/* Display the error only in development */}
        <div className="fixed bottom-0 left-0 right-0 bg-yellow-100 p-2 text-sm z-50">
          <p>Auth error (dev only): {userError}</p>
          <button
            className="underline text-blue-500"
            onClick={() => {
              // Force reload the page to try again
              window.location.reload();
            }}
          >
            Reload page
          </button>
        </div>
        {children}
      </>
    );
  }

  return <>{children}</>;
}
