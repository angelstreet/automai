'use client';

import { ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import * as React from 'react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/sidebar';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { useUser } from '@/context/UserContext';
import { cn } from '@/lib/utils';
import { Role } from '@/types/user';

interface NavGroupProps {
  title: string;
  items: {
    title: string;
    href: string;
    icon: any;
    roles?: string[];
    items?: {
      title: string;
      href: string;
      icon: any;
      roles?: string[];
    }[];
  }[];
}

// Wrap the component with React.memo to prevent unnecessary re-renders
const NavGroup = React.memo(function NavGroup({ title, items }: NavGroupProps) {
  const pathname = usePathname();
  const params = useParams();
  const { user } = useUser();
  const { open } = useSidebar();
  const isCollapsed = !open;
  
  // Get the user role from debug override, user.user_role, or use a default role
  const userRole = (typeof window !== 'undefined' && window.__debugRole) || 
                   user?.user_role || 
                   'viewer';
  
  // Log the current role being used for debugging
  React.useEffect(() => {
    console.log('NavGroup - Current role being used:', userRole);
  }, [userRole]);
  
  // Use useRef for expandedItems to avoid unnecessary re-renders
  const expandedItemsRef = React.useRef<Record<string, boolean>>({});
  
  const isActive = React.useCallback((href: string) => {
    return pathname === `/${params.locale as string}/${params.tenant as string}${href}`;
  }, [pathname, params.locale, params.tenant]);

  const toggleSubmenu = React.useCallback((href: string) => {
    expandedItemsRef.current = {
      ...expandedItemsRef.current,
      [href]: !expandedItemsRef.current[href],
    };
    // Force update to reflect changes
    setForceUpdate(prev => !prev);
  }, []);
  
  // Use a state to force update when expandedItems changes
  const [forceUpdate, setForceUpdate] = React.useState(false);

  // Filter items based on role - memoize this calculation
  const filteredItems = React.useMemo(() => items.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(userRole);
  }), [items, userRole]);

  return (
    <SidebarGroup>
      {!isCollapsed && (
        <SidebarGroupLabel className="text-gray-500 font-medium px-2 py-0.5 text-xs">
          {title}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent className={cn("py-0.5", isCollapsed && "mt-1.5")}>
        <ScrollArea className="h-full">
          <SidebarMenu>
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const hasSubmenu = item.items && item.items.length > 0;
              const isExpanded = expandedItemsRef.current[item.href];

              // Filter submenu items based on role
              const filteredSubItems = item.items?.filter((subItem) => {
                if (!subItem.roles) return true;
                return subItem.roles.includes(userRole);
              });

              // Skip rendering if no accessible submenu items
              if (hasSubmenu && (!filteredSubItems || filteredSubItems.length === 0)) {
                return null;
              }

              return (
                <SidebarMenuItem key={item.href}>
                  {hasSubmenu ? (
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.title}
                      onClick={() => toggleSubmenu(item.href)}
                      className="hover:bg-accent/50 data-[active=true]:bg-accent/50"
                    >
                      <Icon className="h-4 w-4" />
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
                        href={`/${params.locale as string}/${params.tenant as string}${item.href}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}

                  {hasSubmenu && filteredSubItems && (
                    <SidebarMenuSub
                      className={cn(
                        'transition-all duration-200 ease-in-out',
                        !isExpanded && 'hidden',
                      )}
                    >
                      {filteredSubItems.map((subItem) => {
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
                              href={`/${params.locale as string}/${params.tenant as string}${subItem.href}`}
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

// Export the memoized component
export { NavGroup };
