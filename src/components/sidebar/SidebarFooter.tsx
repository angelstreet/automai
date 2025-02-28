import * as React from 'react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

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
