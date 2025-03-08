'use client';

import { useRouter, usePathname, useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, isLoading } = useAuth();
  const isRedirecting = useRef(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const userErrorHandled = useRef(false);
  const authStateProcessed = useRef(false);

  // Properly handle params
  const locale = (params?.locale as string) || 'en';
  const currentTenant = params?.tenant as string;
  
  // Extract path parts for more precise path analysis
  const pathParts = pathname.split('/').filter(Boolean);

  useEffect(() => {
    // Reset redirecting flag when pathname changes
    isRedirecting.current = false;
  }, [pathname]);

  useEffect(() => {
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
      isLoading,
      hasUser: !!user,
      userError: null,
      isRedirecting: isRedirecting.current,
      userErrorHandled: userErrorHandled.current,
      authStateProcessed: authStateProcessed.current
    };
    console.log('RouteGuard state:', info);
    setDebugInfo(info);
  }, [pathname, locale, currentTenant, isLoading, user]);

  useEffect(() => {
    // Don't do anything while loading user data
    if (isLoading) {
      return;
    }

    // Prevent multiple redirects
    if (isRedirecting.current) {
      return;
    }

    const handleRouting = async () => {
      // Only redirect if explicitly on the login or signup page, or root pages
      const shouldRedirectFromPublic = 
        user && 
        !isRedirecting.current && 
        (pathname.includes('/login') || 
         pathname.includes('/signup') || 
         pathname === `/${locale}` || 
         pathname === `/${locale}/`);
      
      if (shouldRedirectFromPublic) {
        const tenant = user.user_metadata?.tenant_name || 'trial'; // Use user's tenant or default
        isRedirecting.current = true;
        router.replace(`/${locale}/${tenant}/dashboard`);
        return;
      }

      // For protected routes with active tenant, we don't need to do any redirects
      // Only consider tenant mismatch if we're at a root path without a tenant
      if (user && pathParts.length <= 2) {
        const expectedTenant = user.user_metadata?.tenant_name || 'trial'; // Default to trial if no tenant

        // Only redirect if we don't have a tenant in the path
        if (expectedTenant && !currentTenant && !isRedirecting.current) {
          isRedirecting.current = true;
          router.replace(`/${locale}/${expectedTenant}/dashboard`);
        }
      }
    };

    // Only run routing logic if we have a definitive auth state (not loading)
    // and we're not already redirecting
    if (!isLoading && !isRedirecting.current) {
      handleRouting();
    }
  }, [pathname, locale, currentTenant, isLoading, user, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
}
