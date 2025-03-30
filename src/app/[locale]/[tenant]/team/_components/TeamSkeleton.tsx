'use client';

import { Skeleton } from '@/components/shadcn/skeleton';

export default function TeamSkeleton() {
  return (
    <div className="space-y-3">
      {/* Team Header Skeleton */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <Skeleton className="h-7 w-64 mb-1.5" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="border-b mb-4">
        <div className="flex gap-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
      </div>

      {/* Content area - to be replaced by tab-specific skeletons */}
      <Skeleton className="h-80 w-full rounded-lg" />
    </div>
  );
}
