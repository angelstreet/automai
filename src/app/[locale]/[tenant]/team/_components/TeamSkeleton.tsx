'use client';

import { Skeleton } from '@/components/shadcn/skeleton';

export default function TeamSkeleton() {
  return (
    <div className="space-y-4">
      {/* Team Header Skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b mb-6">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Content area - to be replaced by tab-specific skeletons */}
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}
