'use client';

import { Skeleton } from '@/components/shadcn/skeleton';

export default function TeamSkeleton() {
  return (
    <div className="space-y-3">
      {/* Tabs Skeleton - TeamHeader now only has tabs */}
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
