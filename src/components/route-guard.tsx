'use client';

import { useEffect } from 'react';
import { useRouter, usePathname, useParams } from 'next/navigation';
import { useUser } from '@/lib/contexts/UserContext';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const { user, isLoading } = useUser();
  const locale = params.locale as string;
  const currentTenant = params.tenant as string;

  useEffect(() => {
    if (isLoading) return;

    const handleRouting = async () => {
      // Public routes don't need tenant
      const isPublicRoute = pathname.includes('/login') || 
        pathname.includes('/signup') || 
        pathname.includes('/auth-redirect') ||
        pathname === `/${locale}`;

      console.log('RouteGuard: Checking route', {
        pathname,
        isPublicRoute,
        user: user ? 'logged in' : 'not logged in'
      });

      if (isPublicRoute) {
        // If user is logged in and trying to access auth pages, redirect to dashboard
        if (user && (pathname.includes('/login') || pathname.includes('/signup'))) {
          const tenantId = user.tenantId || user.plan.toLowerCase();
          console.log('RouteGuard: Logged in user accessing auth page, redirecting to dashboard');
          router.replace(`/${locale}/${tenantId}/dashboard`);
        }
        return;
      }

      // If no user, redirect to login
      if (!user) {
        console.log('RouteGuard: No user found, redirecting to login');
        router.replace(`/${locale}/login`);
        return;
      }

      // Determine expected tenant ID
      const expectedTenantId = user.tenantId || user.plan.toLowerCase();

      console.log('RouteGuard: Checking tenant', {
        currentTenant,
        expectedTenantId
      });

      // If not in correct tenant route, redirect
      if (currentTenant !== expectedTenantId) {
        console.log('RouteGuard: Tenant mismatch, redirecting to correct tenant');
        const newPath = pathname.replace(currentTenant, expectedTenantId);
        router.replace(newPath);
      }
    };

    handleRouting();
  }, [pathname, user, isLoading, locale, currentTenant, router]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return <>{children}</>;
} 