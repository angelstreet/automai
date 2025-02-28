import * as React from 'react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export const SidebarMenuItem = forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      data-sidebar="menu-item"
      className={cn('group/menu-item relative', className)}
      {...props}
    />
  ),
);

SidebarMenuItem.displayName = 'SidebarMenuItem';
