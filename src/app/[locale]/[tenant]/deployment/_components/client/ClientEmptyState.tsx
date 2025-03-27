'use client';

import { Rocket, Plus } from 'lucide-react';
import { Button } from '@/components/shadcn/button';
import { useRouter } from 'next/navigation';
import { EmptyState } from '@/components/layout/EmptyState';

export function ClientEmptyState() {
  const router = useRouter();

  return (
    <div className="rounded-lg border">
      <EmptyState
        icon={<Rocket className="h-10 w-10" />}
        title="No deployments found"
        description="Create your first deployment to get started"
        action={
          <Button onClick={() => router.push('./deployment/new')}>
            <Plus className="h-4 w-4 mr-2" />
            New Deployment
          </Button>
        }
      />
    </div>
  );
}
