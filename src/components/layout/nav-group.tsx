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
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});

  // Check if a submenu item is active and expand its parent
  React.useEffect(() => {
    const newExpandedState = { ...expandedItems };
    items.forEach((item) => {
      if (item.items?.some((subItem) => pathname.includes(subItem.href))) {
        newExpandedState[item.href] = true;
      }
    });
    setExpandedItems(newExpandedState);
  }, [pathname]);

  const toggleSubmenu = (href: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [href]: !prev[href]
    }));
  };

  const isActive = (href: string) => {
    return pathname.includes(href);
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-gray-500 font-medium px-2 py-0.5">
        {title}
      </SidebarGroupLabel>
      <SidebarGroupContent className="py-0.5">
        <ScrollArea className="h-full">
          <SidebarMenu>
            {items.map((item) => {
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
                      <Icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      <ChevronDown 
                        className={cn(
                          "ml-auto h-4 w-4 transition-transform duration-200",
                          isExpanded && "transform rotate-180"
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
                      <Link href={`/${params.locale}/${params.tenant}${item.href}`}>
                        <Icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  )}

                  {hasSubmenu && (
                    <SidebarMenuSub className={cn(
                      "transition-all duration-200 ease-in-out",
                      !isExpanded && "hidden"
                    )}>
                      {item.items?.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const isSubActive = isActive(subItem.href);

                        return (
                          <SidebarMenuSubButton
                            key={subItem.href}
                            asChild
                            isActive={isSubActive}
                            className="hover:bg-accent/50 data-[active=true]:bg-accent/50"
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