'use client';

import { useRouter, usePathname, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

import { useUser } from '@/context/UserContext';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { data: session, status } = useSession();
  const { user, isLoading: isUserLoading, error: userError } = useUser();
  const isRedirecting = useRef(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Properly handle params
  const locale = (params?.locale as string) || 'en';
  const currentTenant = params?.tenant as string;

  useEffect(() => {
    // Reset redirecting flag when pathname changes
    isRedirecting.current = false;
  }, [pathname]);

  useEffect(() => {
    // Log important state for debugging
    const info = {
      pathname,
      locale,
      currentTenant,
      sessionStatus: status,
      isUserLoading,
      hasUser: !!user,
      userError,
      isRedirecting: isRedirecting.current
    };
    console.log('RouteGuard state:', info);
    setDebugInfo(info);
  }, [pathname, locale, currentTenant, status, isUserLoading, user, userError]);

  useEffect(() => {
    // Don't do anything while loading session or user data
    if (status === 'loading' || isUserLoading) return;

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
        status, 
        hasUser: !!user,
        currentTenant
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

      // If session is in error state (e.g. 403), redirect to login
      if (status === 'unauthenticated' && !isPublicRoute && !isRedirecting.current) {
        console.log('Redirecting due to unauthenticated session');
        isRedirecting.current = true;
        router.replace(`/${locale}/login?error=Session expired. Please login again.`);
        return;
      }

      // For public routes, only redirect if user is authenticated and trying to access auth pages
      if (isPublicRoute) {
        if (
          session?.user &&
          user &&
          (pathname.includes('/login') || pathname.includes('/signup'))
        ) {
          const tenant = user.tenantName || 'trial'; // Default to trial if no tenant
          if (tenant && !isRedirecting.current) {
            console.log(`Redirecting authenticated user to dashboard: /${locale}/${tenant}/dashboard`);
            isRedirecting.current = true;
            router.replace(`/${locale}/${tenant}/dashboard`);
          }
        }
        return;
      }

      // For protected routes, ensure we have complete user data
      if (session?.user && user) {
        const expectedTenant = user.tenantName || 'trial'; // Default to trial if no tenant

        // Only redirect if we have a definite tenant mismatch
        if (expectedTenant && currentTenant !== expectedTenant && !isRedirecting.current) {
          console.log(`Tenant mismatch, redirecting: current=${currentTenant}, expected=${expectedTenant}`);
          isRedirecting.current = true;
          router.replace(`/${locale}/${expectedTenant}/dashboard`);
        }
      }
    };

    handleRouting();
  }, [pathname, router, locale, currentTenant, session, status, user, isUserLoading]);

  // Show loading state while checking auth
  if (isUserLoading || status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show debug info in development
  if (process.env.NODE_ENV === 'development' && debugInfo && userError) {
    return (
      <div className="p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Auth Error: {userError}</p>
          <pre className="mt-2 text-xs">{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}
