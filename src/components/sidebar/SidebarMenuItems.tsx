import * as React from 'react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export function SidebarMenu({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

export const SidebarMenuItem = forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
  ({ className, ...props }, ref) => (
    <li
      ref={ref}
      data-sidebar="menu-item"
      className={cn('group/menu-item relative list-none', className)}
      {...props}
    />
  ),
);

SidebarMenuItem.displayName = 'SidebarMenuItem';

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
