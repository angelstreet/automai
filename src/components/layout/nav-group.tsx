'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
} from '@/components/ui/sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    }[];
  }[];
}

export function NavGroup({ title, items }: NavGroupProps) {
  const pathname = usePathname();
  const params = useParams();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const hasActiveItem = React.useMemo(() => {
    return items.some((item) => {
      const isActive = pathname.includes(item.href);
      const hasActiveSubItem = item.items?.some((subItem) => pathname.includes(subItem.href));
      return isActive || hasActiveSubItem;
    });
  }, [items, pathname]);

  React.useEffect(() => {
    if (hasActiveItem) {
      setIsExpanded(true);
    }
  }, [hasActiveItem]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel 
        className="text-gray-500 font-medium cursor-pointer flex items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {title}
        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded ? "transform rotate-180" : "")} />
      </SidebarGroupLabel>
      <SidebarGroupContent className={cn("transition-all duration-200 ease-in-out", !isExpanded && "hidden")}>
        <ScrollArea className="h-full">
          <SidebarMenu>
            {items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname.includes(item.href);
              const hasSubmenu = item.items && item.items.length > 0;

              return (
                <SidebarMenuItem key={item.href}>
                  {hasSubmenu ? (
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      <ChevronDown className="ml-auto h-4 w-4" />
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                    >
                      <Link href={`/${params.locale}/${params.tenant}${item.href}`}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}

                  {hasSubmenu && (
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = pathname.includes(subItem.href);

                        return (
                          <SidebarMenuSubButton
                            key={subItem.href}
                            asChild
                            isActive={isSubActive}
                          >
                            <Link href={`/${params.locale}/${params.tenant}${subItem.href}`}>
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