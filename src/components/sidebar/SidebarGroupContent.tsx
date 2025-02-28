import * as React from 'react';
import { cn } from '@/lib/utils';
import { forwardRef } from 'react';

export const SidebarGroupContent = forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      data-sidebar="group-content"
      className={cn('w-full text-sm', className)}
      {...props}
    />
  ),
);

SidebarGroupContent.displayName = 'SidebarGroupContent';
