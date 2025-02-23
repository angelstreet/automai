'use client';

import { useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useUser } from '@/lib/contexts/UserContext';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { data: session, status } = useSession();
  const { user, isLoading: isUserLoading } = useUser();
  
  // Properly handle params
  const locale = params?.locale as string || 'en';
  const currentTenant = params?.tenant as string;

  useEffect(() => {
    // Don't do anything while loading session or user data
    if (status === 'loading' || isUserLoading) return;

    const handleRouting = async () => {
      // Public routes don't need tenant
      const isPublicRoute = pathname.includes('/login') || 
        pathname.includes('/signup') || 
        pathname.includes('/auth-redirect') ||
        pathname.includes('/error') ||
        pathname === `/${locale}`;

      // Handle OAuth errors
      const searchParams = new URLSearchParams(window.location.search);
      const error = searchParams.get('error');
      if (error) {
        router.replace(`/${locale}/login?error=${error}`);
        return;
      }

      // If session is in error state (e.g. 403), redirect to login
      if (status === 'unauthenticated' && !isPublicRoute) {
        router.replace(`/${locale}/login?error=Session expired. Please login again.`);
        return;
      }

      // For public routes, only redirect if user is authenticated and trying to access auth pages
      if (isPublicRoute) {
        if (session?.user && user && (pathname.includes('/login') || pathname.includes('/signup'))) {
          // Ensure we have the complete user data before redirecting
          const tenant = user.tenantName;
          if (tenant) {
            router.replace(`/${locale}/${tenant}/dashboard`);
          }
        }
        return;
      }

      // For protected routes, ensure we have complete user data
      if (session?.user && user) {
        const expectedTenant = user.tenantName;
        
        // Only redirect if we have a definite tenant mismatch
        if (expectedTenant && currentTenant !== expectedTenant) {
          // Use sessionStorage to prevent redirect loops
          const redirectKey = `redirect_${expectedTenant}`;
          if (!sessionStorage.getItem(redirectKey)) {
            sessionStorage.setItem(redirectKey, 'true');
            router.replace(`/${locale}/${expectedTenant}/dashboard`);
            // Clear the redirect flag after a short delay
            setTimeout(() => sessionStorage.removeItem(redirectKey), 1000);
          }
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

  return <>{children}</>;
} 