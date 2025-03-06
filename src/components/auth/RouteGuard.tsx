'use client';

import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useUser } from '@/context/UserContext';
import supabaseAuth from '@/lib/supabase-auth';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, isLoading: isUserLoading, error: userError } = useUser();
  const isRedirecting = useRef(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const userErrorHandled = useRef(false);

  // Properly handle params
  const locale = (params?.locale as string) || 'en';
  const currentTenant = params?.tenant as string;

  // Add a listener for auth state changes from UserContext
  useEffect(() => {
    console.log('RouteGuard - Using auth state from UserContext');
    
    // Listen for auth state change events from UserContext
    const handleAuthStateChange = (event: any) => {
      const { isAuthenticated, isLoading, hasError } = event.detail;
      console.log('RouteGuard received auth state change:', { isAuthenticated, isLoading, hasError });
      
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
    };
    console.log('RouteGuard state:', info);
    setDebugInfo(info);
  }, [pathname, locale, currentTenant, isUserLoading, user, userError]);

  useEffect(() => {
    // Don't do anything while loading user data
    if (isUserLoading) return;

    // Prevent multiple redirects
    if (isRedirecting.current) return;

    const handleRouting = async () => {
      // Public routes don't need tenant
      const isPublicRoute =
        pathname.includes('/login') ||
        pathname.includes('/signup') ||
        pathname.includes('/(auth)/auth-redirect') ||
        pathname.includes('/error') ||
        pathname === `/${locale}`;

      console.log('Handling routing:', {
        isPublicRoute,
        pathname,
        hasUser: !!user,
        currentTenant,
        userError,
        userErrorHandled: userErrorHandled.current,
      });

      // Handle OAuth errors
      const searchParams = new URLSearchParams(window.location.search);
      const error = searchParams.get('error');
      if (error && !isRedirecting.current) {
        console.log('Redirecting due to OAuth error');
        isRedirecting.current = true;
        router.replace(`/${locale}/login?error=${error}`);
        return;
      }

      // DISABLE CLIENT-SIDE REDIRECTS FOR UNAUTHENTICATED USERS
      // Let the middleware handle this instead
      // The middleware will redirect unauthenticated users to login

      // For public routes, only redirect if user is authenticated and trying to access auth pages
      if (isPublicRoute) {
        // Only redirect from login/signup to dashboard if we have a valid user
        if (
          user &&
          (pathname.includes('/login') || pathname.includes('/signup'))
        ) {
          // The tenant comes from the user object, with a fallback to 'trial'
          const tenant = user.tenantName || 'trial';
            
          if (tenant && !isRedirecting.current) {
            console.log(
              `RouteGuard - Redirecting authenticated user to dashboard: /${locale}/${tenant}/dashboard`
            );
            isRedirecting.current = true;
            router.replace(`/${locale}/${tenant}/dashboard`);
          }
        }
        return;
      }

      // For protected routes, ensure we have complete user data
      if (user) {
        const expectedTenant = user.tenantName || 'trial'; // Default to trial if no tenant

        // Only redirect if we have a definite tenant mismatch
        if (expectedTenant && currentTenant !== expectedTenant && !isRedirecting.current) {
          console.log(
            `Tenant mismatch, redirecting: current=${currentTenant}, expected=${expectedTenant}`,
          );
          isRedirecting.current = true;
          router.replace(`/${locale}/${expectedTenant}/dashboard`);
        }
      }
    };

    handleRouting();
  }, [pathname, locale, currentTenant, isUserLoading, user, userError, router]);

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
      pathname
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
