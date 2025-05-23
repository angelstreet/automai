import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import type { VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/shadcn/tooltip';
import { useSidebar } from '@/hooks';
import { useIsMobile } from '@/hooks/useMobile';
import { cn } from '@/lib/utils';

const sidebarMenuButtonVariants = cva(
  'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        outline:
          'bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]',
      },
      size: {
        default: 'h-8 text-sm',
        sm: 'h-7 text-xs',
        lg: 'h-12 text-sm group-data-[collapsible=icon]:!p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  },
);

export const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    { asChild = false, isActive = false, variant = 'default', size, tooltip, className, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    const sidebarContext = useSidebar('SidebarMenuButton');
    const isOpen = sidebarContext?.isOpen ?? false;
    const isMobile = useIsMobile();

    // Use a ref to safely update attributes after initial render
    const buttonRef = React.useRef<HTMLButtonElement | null>(null);
    const mergedRef = useMergedRef(ref, buttonRef);

    // Update data attributes after mount to match client state
    React.useLayoutEffect(() => {
      const buttonEl = buttonRef.current;
      if (buttonEl) {
        // These are the attributes that were causing hydration issues
        buttonEl.setAttribute('data-size', size || 'sm');
      }
    }, [size]);

    const button = (
      <Comp
        ref={mergedRef}
        data-sidebar="menu-button"
        data-size="sm" // Always start with sm for SSR
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    );

    // useMergedRef helper function
    function useMergedRef<T>(...refs: React.Ref<T>[]) {
      return React.useCallback(
        (element: T) => {
          refs.forEach((ref) => {
            if (typeof ref === 'function') {
              ref(element);
            } else if (ref != null) {
              (ref as React.MutableRefObject<T>).current = element;
            }
          });
        },
        [refs],
      );
    }

    if (!tooltip) {
      return button;
    }

    if (typeof tooltip === 'string') {
      tooltip = {
        children: tooltip,
      };
    }

    // Get showTooltips from context
    const showTooltips = sidebarContext?.showTooltips ?? false;

    // If tooltips are disabled, just return the button without the tooltip wrapper
    if (!showTooltips) {
      return button;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" align="center" hidden={isOpen || isMobile} {...tooltip} />
      </Tooltip>
    );
  },
);

SidebarMenuButton.displayName = 'SidebarMenuButton';
