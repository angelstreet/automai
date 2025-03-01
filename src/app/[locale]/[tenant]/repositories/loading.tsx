import { Skeleton } from '@/components/shadcn/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/shadcn/card';

export default function RepositoriesLoading() {
  return (
    <div className="flex-1 space-y-4 pt-5">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-[150px]" />
        <Skeleton className="h-10 w-[150px]" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-10 w-[300px]" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="pb-2">
                <Skeleton className="h-5 w-[140px] mb-1" />
                <Skeleton className="h-4 w-[100px]" />
              </CardHeader>
              <CardContent className="pb-2">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-[80%] mb-2" />
                <Skeleton className="h-3 w-[120px] mb-1" />
                <Skeleton className="h-3 w-[150px]" />
              </CardContent>
              <CardFooter>
                <div className="flex justify-between w-full">
                  <Skeleton className="h-9 w-[60px]" />
                  <Skeleton className="h-9 w-[60px]" />
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
} 