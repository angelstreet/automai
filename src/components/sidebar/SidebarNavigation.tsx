'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import * as React from 'react';

import { ScrollArea } from '@/components/shadcn/scroll-area';
import { useSidebar } from '@/hooks';
import { cn } from '@/lib/utils';
import { Role } from '@/types/service/userServiceType';

// Menu button component
const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string;
  }
>(({ asChild = false, isActive = false, tooltip, className, children, ...props }, ref) => {
  const Comp = asChild ? 'a' : 'button';
  
  return (
    <Comp
      ref={ref}
      data-sidebar="menu-button"
      data-active={isActive}
      className={cn(
        'flex w-full items-center gap-2 rounded-md p-2 text-left text-sm',
        'hover:bg-accent/50 data-[active=true]:bg-accent/50',
        'focus-visible:ring-2 ring-sidebar-ring',
        'transition-all duration-200',
        '[&>svg]:size-4 [&>svg]:shrink-0',
        '[&>span:last-child]:truncate',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});

SidebarMenuButton.displayName = 'SidebarMenuButton';

// Menu sub-button component
const SidebarMenuSubButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<'button'> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string;
  }
>(({ asChild = false, isActive = false, tooltip, className, children, ...props }, ref) => {
  const Comp = asChild ? 'a' : 'button';

  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-active={isActive}
      className={cn(
        'flex w-full items-center gap-2 rounded-md p-2 text-left text-sm',
        'hover:bg-accent/50 data-[active=true]:bg-accent/50',
        'focus-visible:ring-2 ring-sidebar-ring',
        'transition-all duration-200',
        '[&>svg]:size-4 [&>svg]:shrink-0',
        '[&>span:last-child]:truncate',
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
});

SidebarMenuSubButton.displayName = 'SidebarMenuSubButton';

// Menu container components
function SidebarMenu({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

const SidebarMenuItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
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

const SidebarMenuSub = React.forwardRef<HTMLDivElement, React.ComponentProps<'div'>>(
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

// Group components
function SidebarGroup({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-2 pb-2', className)} {...props}>
      {children}
    </div>
  );
}

function SidebarGroupContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

function SidebarGroupLabel({
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

// Main navigation component
interface SidebarNavigationProps {
  items: {
    title: string;
    href: string;
    icon?: React.ComponentType<{ className?: string }>;
    roles?: Role[];
    items?: {
      title: string;
      href: string;
      icon: React.ComponentType<{ className?: string }>;
      roles?: Role[];
    }[];
  }[][];
  groupTitles: string[];
  currentRole: Role;
}

export function SidebarNavigation({ items, groupTitles, currentRole }: SidebarNavigationProps) {
  const pathname = usePathname();
  const params = useParams();
  const { open } = useSidebar();
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});

  // Update isCollapsed after initial render to prevent hydration mismatch
  React.useEffect(() => {
    setIsCollapsed(!open);
  }, [open]);

  const isActive = React.useCallback(
    (href: string) => {
      if (!pathname || !params.locale || !params.tenant) return false;
      // Create the full path to compare
      const fullPath = `/${params.locale as string}/${params.tenant as string}${href}`;
      // Compare only the pathname part (ignore query string and hash)
      return pathname === fullPath;
    },
    [pathname, params.locale, params.tenant],
  );

  const toggleSubmenu = React.useCallback((href: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  }, []);

  // Filter items based on current role
  const filteredItems = React.useMemo(() => {
    return items.map((group) => 
      group.filter((item) => !item.roles || item.roles.includes(currentRole))
        .map((item) => ({
          ...item,
          items: item.items?.filter(
            (subItem) => !subItem.roles || subItem.roles.includes(currentRole),
          ),
        }))
    );
  }, [items, currentRole]);

  return (
    <ScrollArea className="h-full">
      {filteredItems.map((group, groupIndex) => (
        group.length > 0 && (
          <SidebarGroup key={groupTitles[groupIndex]}>
            {!isCollapsed && (
              <SidebarGroupLabel className="text-gray-500 font-medium px-2 py-0.5 text-xs">
                {groupTitles[groupIndex]}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent className={cn('py-0.5', isCollapsed && 'mt-1.5')}>
              <SidebarMenu>
                {group.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  const hasSubmenu = item.items && item.items.length > 0;
                  const isExpanded = expandedItems[item.href];

                  return (
                    <SidebarMenuItem key={item.href}>
                      {hasSubmenu ? (
                        <SidebarMenuButton
                          isActive={active}
                          onClick={() => toggleSubmenu(item.href)}
                        >
                          {Icon && <Icon className="h-4 w-4" />}
                          <span>{item.title}</span>
                          <ChevronDown
                            className={cn(
                              'ml-auto h-4 w-4 transition-transform duration-200',
                              isExpanded && 'transform rotate-180',
                            )}
                          />
                        </SidebarMenuButton>
                      ) : (
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                        >
                          <Link
                            href={`/${params.locale as string}/${params.tenant as string}${item.href.startsWith('/') ? item.href : `/${item.href}`}`}
                          >
                            {Icon && <Icon className="h-4 w-4" />}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}

                      {hasSubmenu && item.items && (
                        <SidebarMenuSub
                          className={cn(
                            'transition-all duration-200 ease-in-out',
                            !isExpanded && 'hidden',
                          )}
                        >
                          {item.items.map((subItem) => {
                            const SubIcon = subItem.icon;
                            const isSubActive = isActive(subItem.href);

                            return (
                              <SidebarMenuSubButton
                                key={subItem.href}
                                asChild
                                isActive={isSubActive}
                              >
                                <Link
                                  href={`/${params.locale as string}/${params.tenant as string}${subItem.href.startsWith('/') ? subItem.href : `/${subItem.href}`}`}
                                >
                                  <SubIcon className="h-4 w-4" />
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            );
                          })}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )
      ))}
    </ScrollArea>
  );
}

export {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuButton,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
};