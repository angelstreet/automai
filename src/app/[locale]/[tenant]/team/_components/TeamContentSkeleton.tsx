'use client';

import { Skeleton } from '@/components/shadcn/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/shadcn/tabs';

export default function TeamContentSkeleton() {
  return (
    <div className="space-y-6">
      {/* Tabs Skeleton */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="overview" disabled>
            <Skeleton className="h-5 w-20" />
          </TabsTrigger>
          <TabsTrigger value="members" disabled>
            <Skeleton className="h-5 w-20" />
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Content area skeleton */}
      <div className="space-y-6">
        {/* Subscription card skeleton */}
        <Skeleton className="h-24 w-full rounded-lg" />

        {/* Resources card skeleton */}
        <Skeleton className="h-80 w-full rounded-lg" />
      </div>
    </div>
  );
}
