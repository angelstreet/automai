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
import { cn } from '@/lib/utils';

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
  const { open } = useSidebar();
  const isCollapsed = !open;

  // Use useRef for expandedItems to avoid unnecessary re-renders
  const expandedItemsRef = React.useRef<Record<string, boolean>>({});

  const isActive = React.useCallback(
    (href: string) => {
      return pathname === `/${params.locale as string}/${params.tenant as string}${href}`;
    },
    [pathname, params.locale, params.tenant],
  );

  const toggleSubmenu = React.useCallback((href: string) => {
    expandedItemsRef.current = {
      ...expandedItemsRef.current,
      [href]: !expandedItemsRef.current[href],
    };
    // Force update to reflect changes
    setForceUpdate((prev) => !prev);
  }, []);

  // Use a state to force update when expandedItems changes
  const [forceUpdate, setForceUpdate] = React.useState(false);

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
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const hasSubmenu = item.items && item.items.length > 0;
              const isExpanded = expandedItemsRef.current[item.href];

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
