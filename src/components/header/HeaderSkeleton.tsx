import { cn } from '@/lib/utils';

interface HeaderSkeletonProps {
  className?: string;
}

export function HeaderSkeleton({ className }: HeaderSkeletonProps) {
  return (
    <header className={cn('sticky top-0 z-40 w-full bg-background/95 backdrop-blur', className)}>
      <div className="flex h-14 items-center border-b">
        {/* Left section */}
        <div className="relative flex items-center h-full">
          <div className="flex items-center ml-4">
            <div className="h-8 w-8 bg-muted/30 rounded-md animate-pulse" />
          </div>
        </div>

        {/* Center section */}
        <div className="flex-1" />

        {/* Right section */}
        <div className="flex items-center gap-2 px-4 h-full">
          <div className="h-8 w-8 bg-muted/30 rounded-full animate-pulse" />
        </div>
      </div>
    </header>
  );
}
