import { Skeleton } from '@/components/shadcn/skeleton';

export function RepositorySkeleton() {
  // Create an array to represent 6 repository cards
  const skeletonCards = Array.from({ length: 6 }, (_, i) => i);

  return (
    <div className="w-full">
      {/* Repository list skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {skeletonCards.map((index) => (
          <div key={index} className="overflow-hidden rounded-lg border bg-white p-4 shadow-sm">
            <div className="mb-4 flex justify-between">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <Skeleton className="mb-2 h-4 w-1/2" />
            <Skeleton className="mb-4 h-4 w-1/3" />
            <div className="flex justify-between">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
            <div className="mt-4 flex items-center justify-between">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-5 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
