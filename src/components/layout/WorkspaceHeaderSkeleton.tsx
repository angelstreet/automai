'use client';

import { Separator } from '@/components/shadcn/separator';

export function WorkspaceHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 animate-in fade-in-50 duration-500">
      <div className="flex h-14 items-center">
        {/* Left section */}
        <div className="relative flex items-center h-full">
          <div className="absolute flex items-center ml-1">
            <div className="h-8 w-8 bg-muted/30 rounded-md animate-pulse" />
            <Separator orientation="vertical" className="h-8 opacity-50 ml-2" />
          </div>
        </div>

        {/* Center section */}
        <div className="flex-1" />
        <Separator orientation="vertical" className="h-8 opacity-50" />

        {/* Right section */}
        <div className="flex items-center gap-2 px-4 h-full">
          <div className="flex-none w-36 mr-12">
            <div className="w-[180px] h-10 bg-muted/30 animate-pulse rounded-md"></div>
          </div>
          <Separator orientation="vertical" className="h-8 opacity-30" />
          <div className="flex-1 max-w-[32rem] min-w-[12.5rem]">
            <div className="w-full h-10 bg-muted/20 animate-pulse rounded-md" />
          </div>
          <div className="flex items-center gap-1">
            <Separator orientation="vertical" className="h-8 opacity-30" />
            <div className="h-8 w-8 bg-muted/30 rounded-md animate-pulse" />
            <Separator orientation="vertical" className="h-8 opacity-30" />
            <div className="h-8 w-8 bg-muted/30 rounded-md animate-pulse" />
            <Separator orientation="vertical" className="h-8 opacity-30" />
            <div className="h-8 w-8 bg-muted/30 rounded-md animate-pulse" />
          </div>
        </div>
      </div>
    </header>
  );
}
