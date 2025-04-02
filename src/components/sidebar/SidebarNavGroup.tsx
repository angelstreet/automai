'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import * as React from 'react';

import { ScrollArea } from '@/components/shadcn/scroll-area';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/sidebar';
import { useSidebar } from '@/hooks';
import { cn } from '@/lib/utils';
import { Role } from '@/types/service/userServiceType';

// Add type definitions for the custom event
declare global {
  interface WindowEventMap {
    'debug-role-change': CustomEvent<{
      role: Role;
      user: any;
      previousRole?: Role;
    }>;
  }
}

interface SidebarNavGroupProps {
  title: string;
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
  }[];
}

// Wrap the component with React.memo to prevent unnecessary re-renders
export const SidebarNavGroup = React.memo(function SidebarNavGroup({
  title,
  items,
}: SidebarNavGroupProps) {
  const pathname = usePathname();
  const params = useParams();
  const { open } = useSidebar();

  // Use state for isCollapsed to ensure hydration consistency
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  // Add state for tracking the current role
  const [currentRole, setCurrentRole] = React.useState<Role>(
    typeof window !== 'undefined' && window.__debugRole ? window.__debugRole : 'viewer',
  );

  // Add event listener for role changes
  React.useEffect(() => {
    const handleRoleChange = (event: CustomEvent<{ role: Role; user: any }>) => {
      console.log('[SidebarNavGroup] Role changed to:', event.detail.role);
      setCurrentRole(event.detail.role);
    };

    window.addEventListener('debug-role-change', handleRoleChange);

    return () => {
      window.removeEventListener('debug-role-change', handleRoleChange);
    };
  }, []);

  // Create a memoized version of items to prevent layout shifts
  const stableItems = React.useMemo(() => items, [items]);

  // Filter items based on current role
  const filteredItems = React.useMemo(() => {
    return stableItems
      .filter((item) => !item.roles || item.roles.includes(currentRole))
      .map((item) => ({
        ...item,
        items: item.items?.filter(
          (subItem) => !subItem.roles || subItem.roles.includes(currentRole),
        ),
      }));
  }, [stableItems, currentRole]);

  // Update isCollapsed after initial render to prevent hydration mismatch
  React.useEffect(() => {
    setIsCollapsed(!open);
  }, [open]);

  // Use state instead of ref for better handling of hydration
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});

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

  return (
    <SidebarGroup>
      {!isCollapsed && (
        <SidebarGroupLabel className="text-gray-500 font-medium px-2 py-0.5 text-xs">
          {title}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent className={cn('py-0.5', isCollapsed && 'mt-1.5')}>
        <ScrollArea className="h-full">
          <SidebarMenu>
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const hasSubmenu = item.items && item.items.length > 0;
              const isExpanded = expandedItems[item.href];

              return (
                <SidebarMenuItem key={item.href}>
                  {hasSubmenu ? (
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      onClick={() => toggleSubmenu(item.href)}
                      className="hover:bg-accent/50 data-[active=true]:bg-accent/50"
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
                      tooltip={item.title}
                      className="hover:bg-accent/50 data-[active=true]:bg-accent/50"
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
                            className="hover:bg-accent/50 data-[active=true]:bg-accent/50"
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
        </ScrollArea>
      </SidebarGroupContent>
    </SidebarGroup>
  );
});
