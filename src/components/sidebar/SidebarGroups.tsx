import * as React from 'react';

import { Button, ButtonProps } from '@/components/shadcn/button';
import { cn } from '@/lib/utils';

export function SidebarGroup({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-2 pb-2', className)} {...props}>
      {children}
    </div>
  );
}

export function SidebarGroupAction({ className, children, ...props }: ButtonProps) {
  return (
    <Button
      variant="sidebar"
      size="xs"
      className={cn(
        'my-1 h-7 justify-start truncate text-xs text-sidebar-muted-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}

export function SidebarGroupContent({
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

export function SidebarGroupLabel({
  className,
  children,
  isCollapsed,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement> & {
  isCollapsed?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex justify-between items-center mb-2',
        isCollapsed && 'flex-col-reverse items-center justify-center gap-2',
        className,
      )}
      {...props}
    >
      <p
        className={cn('text-xs font-medium text-sidebar-muted-foreground', isCollapsed && 'hidden')}
      >
        {children}
      </p>
    </div>
  );
}
