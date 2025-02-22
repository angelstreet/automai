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
  const { user, isLoading } = useUser();
  const locale = params.locale as string;
  const currentTenant = params.tenant as string;

  useEffect(() => {
    if (status === 'loading' || isLoading) return;

    const handleRouting = async () => {
      // Public routes don't need tenant
      const isPublicRoute = pathname.includes('/login') || 
        pathname.includes('/signup') || 
        pathname.includes('/auth-redirect') ||
        pathname === `/${locale}`;

      if (isPublicRoute) {
        // If user is logged in and trying to access auth pages, redirect to dashboard
        if (session && (pathname.includes('/login') || pathname.includes('/signup'))) {
          const tenantId = user?.tenantId || user?.plan?.toLowerCase();
          router.replace(`/${locale}/${tenantId}/dashboard`);
        }
        return;
      }

      // If no session, redirect to login
      if (!session) {
        router.replace(`/${locale}/login`);
        return;
      }

      // If no user data yet, wait
      if (!user) return;

      // Determine expected tenant ID
      const expectedTenantId = user.tenantId || user.plan.toLowerCase();

      // If current tenant doesn't match expected tenant, redirect
      if (currentTenant !== expectedTenantId) {
        router.replace(`/${locale}/${expectedTenantId}/dashboard`);
      }
    };

    handleRouting();
  }, [pathname, router, locale, currentTenant, session, status, user, isLoading]);

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