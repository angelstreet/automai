import * as React from 'react';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const SidebarFooter = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-sidebar="footer"
        className={cn('flex flex-col gap-2 p-2', className)}
        {...props}
      />
    );
  },
);

SidebarFooter.displayName = 'SidebarFooter';
