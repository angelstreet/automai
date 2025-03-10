'use client';

import { useRouter, useParams } from 'next/navigation';
import * as React from 'react';
import { useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { useUser } from '@/context/UserContext';

export default function UseCasesPage() {
  const router = useRouter();
  const paramsPromise = useParams();
  const params = React.use(paramsPromise);
  const locale = params.locale as string;
  const tenant = params.tenant as string;
  const { user, isLoading: userLoading } = useUser();

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${locale}/login`);
    }
  }, [userLoading, user, router, locale]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Use Cases</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Use Cases Feature Coming Soon</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This feature is currently under development and will be available in a future update.
        </p>
        <Button
          onClick={() => router.push(`/${locale}/${tenant}/dashboard`)}
          variant="default"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
