'use client';

import { usePathname, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

import { useUser } from '@/context/UserContext';

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const { data: session, status } = useSession();
  const { user, isLoading: isUserLoading, error: userError } = useUser();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Properly handle params
  const locale = (params?.locale as string) || 'en';
  const currentTenant = params?.tenant as string;

  useEffect(() => {
    // Log important state for debugging
    const info = {
      pathname,
      locale,
      currentTenant,
      sessionStatus: status,
      isUserLoading,
      hasUser: !!user,
      userError
    };
    console.log('RouteGuard state:', info);
    setDebugInfo(info);
  }, [pathname, locale, currentTenant, status, isUserLoading, user, userError]);

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
