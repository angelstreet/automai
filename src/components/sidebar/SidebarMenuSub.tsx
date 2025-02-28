import * as React from 'react';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const SidebarMenuSub = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar="menu-sub"
      className={cn('flex w-full min-w-0 flex-col gap-1 pl-6', className)}
      {...props}
    />
  ),
);

SidebarMenuSub.displayName = 'SidebarMenuSub';
