import * as React from 'react';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const SidebarHeader = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="header"
        className={cn('flex flex-col gap-2 p-2', className)}
        {...props}
      />
    );
  },
);

SidebarHeader.displayName = 'SidebarHeader';
