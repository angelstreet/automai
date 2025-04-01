import { cn } from '@/lib/utils';

interface HeaderSkeletonProps {
  className?: string;
}

export function HeaderSkeleton({ className }: HeaderSkeletonProps) {
  return (
    <header className={cn('w-full flex items-center justify-between p-4 bg-background', className)}>
      <div className="h-8 w-8 bg-muted/30 rounded-md animate-pulse" />
      <div className="h-8 w-8 bg-muted/30 rounded-full animate-pulse" />
    </header>
  );
}
