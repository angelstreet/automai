import * as React from 'react';

import { useSidebar } from '@/hooks';
import { cn } from '@/lib/utils';

export const SidebarRail = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(
  ({ className, ...props }, ref) => {
    const sidebarContext = useSidebar('SidebarRail');

    if (!sidebarContext) {
      return null;
    }

    const { toggleSidebar } = sidebarContext;

    return (
      <button
        ref={ref}
        data-sidebar="rail"
        aria-label="Toggle Sidebar"
        tabIndex={-1}
        onClick={toggleSidebar}
        title="Toggle Sidebar"
        className={cn(
          'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all duration-300 ease-in-out',
          'bg-accent/30 hover:bg-accent/40 dark:bg-accent/50 dark:hover:bg-accent/70',
          'after:absolute after:inset-y-0 after:left-1/2 after:w-[4px] after:bg-accent/40 hover:after:bg-accent/60 dark:after:bg-accent/60 dark:hover:after:bg-accent/80',
          'group-data-[side=left]:-right-4 sm:flex',
          'cursor-pointer', // Override resize cursors with simple pointer
          'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full',
          '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
          '[[data-side=right][data-collapsible=offcanvas]_&]:-right-2',
          className,
        )}
        {...props}
      />
    );
  },
);

SidebarRail.displayName = 'SidebarRail';
