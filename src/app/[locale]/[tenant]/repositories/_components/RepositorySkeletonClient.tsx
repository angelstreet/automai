import { Card, CardContent } from '@/components/shadcn/card';
import { Skeleton } from '@/components/shadcn/skeleton';

export function RepositorySkeletonClient() {
  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent>
        {/* Header with tabs and search */}
        <div className="flex justify-between items-center py-4 mb-4 relative">
          <div className="absolute inset-0 flex justify-center items-center">
            <div className="flex gap-2 min-w-[400px]">
              {Array(4)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-9 flex-1" />
                ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-36" />
          </div>

          <div className="relative w-[300px]">
            <Skeleton className="h-9" />
          </div>
        </div>

        {/* Repository cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="space-y-2 p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}
