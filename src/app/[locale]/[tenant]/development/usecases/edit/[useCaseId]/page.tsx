'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect } from 'react';

import { Button } from '@/components/shadcn/button';
import { useAuth } from '@/hooks/useAuth';

export default function UseCaseEditPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isLoading: userLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!userLoading && !user) {
      router.push(`/${params.locale}/login`);
    }
  }, [userLoading, user, router, params.locale]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="hover:bg-muted/50 dark:hover:bg-muted/20 mr-4"
        >
          ←
        </Button>
        <h1 className="text-2xl font-bold">Use Case Editor</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
        <h2 className="text-xl font-semibold mb-4">Use Case Editor Coming Soon</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This feature is currently under development and will be available in a future update.
        </p>
        <Button
          onClick={() => router.push(`/${params.locale}/${params.tenant}/dashboard`)}
          variant="default"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}
