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
  const [session, setSession] = useState<any>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const isRedirecting = useRef(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const userErrorHandled = useRef(false);

  // Properly handle params
  const locale = (params?.locale as string) || 'en';
  const currentTenant = params?.tenant as string;

  // Load Supabase session
  useEffect(() => {
    async function loadSession() {
      setIsSessionLoading(true);
      try {
        const { data } = await supabaseAuth.getSession();
        setSession(data.session);
      } catch (error) {
        console.error('Error loading session:', error);
      } finally {
        setIsSessionLoading(false);
      }
    }
    
    loadSession();
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
      sessionStatus: isSessionLoading ? 'loading' : session ? 'authenticated' : 'unauthenticated',
      isUserLoading,
      hasUser: !!user,
      userError,
      isRedirecting: isRedirecting.current,
      userErrorHandled: userErrorHandled.current,
    };
    console.log('RouteGuard state:', info);
    setDebugInfo(info);
  }, [pathname, locale, currentTenant, isSessionLoading, session, isUserLoading, user, userError]);

  useEffect(() => {
    // Don't do anything while loading session or user data
    if (isSessionLoading || isUserLoading) return;

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
        hasSession: !!session,
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
        // Only redirect from login/signup to dashboard if we have a valid user and no user error
        if (
          session?.user &&
          user &&
          !userError &&
          (pathname.includes('/login') || pathname.includes('/signup'))
        ) {
          const tenant = user.tenantName || 'trial'; // Default to trial if no tenant
          if (tenant && !isRedirecting.current) {
            console.log(
              `Redirecting authenticated user to dashboard: /${locale}/${tenant}/dashboard`,
            );
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
          console.log(
            `Tenant mismatch, redirecting: current=${currentTenant}, expected=${expectedTenant}`,
          );
          isRedirecting.current = true;
          router.replace(`/${locale}/${expectedTenant}/dashboard`);
        }
      }
    };

    handleRouting();
  }, [pathname, locale, currentTenant, isSessionLoading, session, isUserLoading, user, userError, router]);

  // Show loading state while checking auth
  if (isUserLoading || isSessionLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show debug info in development
  if (process.env.NODE_ENV === 'development' && debugInfo && userError) {
    // Log the error but don't show the banner
    console.error('Auth Error:', userError, debugInfo);

    // Return children without the error banner
    return <>{children}</>;
  }

  return <>{children}</>;
}
