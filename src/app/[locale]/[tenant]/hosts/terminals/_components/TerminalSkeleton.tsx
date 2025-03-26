import { Skeleton } from '@/components/shadcn/skeleton';

export default function TerminalSkeleton() {
  return (
    <div className="flex flex-col space-y-3 w-full h-full p-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-[calc(100vh-12rem)] w-full" />
      <div className="flex flex-row gap-3">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-36" />
      </div>
    </div>
  );
}
