import * as React from 'react';

import { useSidebar } from '@/hooks';
import { cn } from '@/lib/utils';

export const SidebarRail = React.forwardRef<HTMLButtonElement, React.ComponentProps<'button'>>(
  ({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar('SidebarRail');

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
          'bg-accent/10 hover:bg-accent/20',
          'after:absolute after:inset-y-0 after:left-1/2 after:w-[4px] after:bg-accent/20 hover:after:bg-accent/40',
          'group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex',
          'cursor-pointer', // Override resize cursors with simple pointer
          'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full',
          '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
          '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
          className,
        )}
        {...props}
      />
    );
  },
);

SidebarRail.displayName = 'SidebarRail';
