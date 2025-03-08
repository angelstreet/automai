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
} from '@/components/sidebar';
import { ScrollArea } from '@/components/shadcn/scroll-area';
import { useRole } from '@/context/RoleContext';
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

export function NavGroup({ title, items }: NavGroupProps) {
  const pathname = usePathname();
  const paramsPromise = useParams();
  const params = React.use(paramsPromise);
  const locale = params.locale as string;
  const tenant = params.tenant as string;
  
  const { currentRole } = useRole();
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});

  const isActive = (href: string) => {
    return pathname === `/${locale}/${tenant}${href}`;
  };

  const toggleSubmenu = (href: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  // Filter items based on role
  const filteredItems = items.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(currentRole);
  });

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-gray-500 font-medium px-2 py-0.5">
        {title}
      </SidebarGroupLabel>
      <SidebarGroupContent className="py-0.5">
        <ScrollArea className="h-full">
          <SidebarMenu>
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const hasSubmenu = item.items && item.items.length > 0;
              const isExpanded = expandedItems[item.href];

              // Filter submenu items based on role
              const filteredSubItems = item.items?.filter((subItem) => {
                if (!subItem.roles) return true;
                return subItem.roles.includes(currentRole);
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
                        href={`/${locale}/${tenant}${item.href}`}
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
                              href={`/${locale}/${tenant}${subItem.href}`}
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
}
