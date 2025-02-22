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
      if (pathname.includes('/login') || 
          pathname.includes('/signup') || 
          pathname.includes('/auth-redirect') ||
          pathname === `/${locale}`) {
        return;
      }

      // If no user, redirect to login
      if (!user) {
        router.replace(`/${locale}/login`);
        return;
      }

      // Determine expected tenant ID
      let expectedTenantId;
      if (user.tenantId) {
        // Enterprise users use their actual tenant ID
        expectedTenantId = user.tenantId;
      } else {
        // Trial and Pro users use fixed tenant IDs
        expectedTenantId = user.plan.toLowerCase();
      }

      // If not in correct tenant route, redirect
      if (currentTenant !== expectedTenantId) {
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