'use client';

import { NavGroup } from '@/components/layout/NavGroup';
import { NavUser } from '@/components/layout/NavUser';
import { TeamSwitcher } from '@/components/layout/TeamSwitcher';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarProvider,
} from '@/components/sidebar';
import { useRole } from '@/context/RoleContext';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { User } from '@supabase/supabase-js';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { 
  LayoutDashboard, 
  Settings, 
  Users, 
  CreditCard, 
  GitBranch,
  Server,
  Terminal,
  FileCode,
  TestTube,
  BarChart,
  Menu,
  X,
  FolderKanban
} from 'lucide-react';
import { useState } from 'react';

interface AppSidebarProps {
  user: User | null;
  tenant: string;
  locale: string;
}

export function AppSidebar({ user, tenant, locale }: AppSidebarProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const { role } = useRole();

  // If no user is provided, return null
  if (!user) {
    console.warn('AppSidebar: No user data provided');
    return null;
  }

  // Define sidebar navigation items
  const sidebarData = {
    navGroups: [
      {
        title: t('Menu.title'),
        items: [
          {
            title: t('Dashboard.title'),
            href: `/${locale}/${tenant}/dashboard`,
            icon: LayoutDashboard,
            active: pathname === `/${locale}/${tenant}/dashboard`,
            roles: ['user', 'admin'],
          },
          {
            title: t('Projects.projects'),
            href: `/${locale}/${tenant}/projects`,
            icon: FolderKanban,
            active: pathname === `/${locale}/${tenant}/projects`,
            roles: ['user', 'admin'],
          },
          {
            title: t('Common.hosts'),
            href: `/${locale}/${tenant}/hosts`,
            icon: Server,
            active: pathname === `/${locale}/${tenant}/hosts`,
            roles: ['user', 'admin'],
          },
          {
            title: t('Common.terminal'),
            href: `/${locale}/${tenant}/terminals`,
            icon: Terminal,
            active: pathname === `/${locale}/${tenant}/terminals`,
            roles: ['user', 'admin'],
          },
          {
            title: t('repositories.repositories'),
            href: `/${locale}/${tenant}/repositories`,
            icon: GitBranch,
            active: pathname === `/${locale}/${tenant}/repositories`,
            roles: ['user', 'admin'],
          },
          {
            title: 'Scripts',
            href: `/${locale}/${tenant}/scripts`,
            icon: FileCode,
            active: pathname === `/${locale}/${tenant}/scripts`,
            roles: ['user', 'admin'],
          },
          {
            title: 'Tests',
            href: `/${locale}/${tenant}/tests`,
            icon: TestTube,
            active: pathname === `/${locale}/${tenant}/tests`,
            roles: ['user', 'admin'],
          },
          {
            title: 'Reports',
            href: `/${locale}/${tenant}/reports`,
            icon: BarChart,
            active: pathname === `/${locale}/${tenant}/reports`,
            roles: ['user', 'admin'],
          },
          {
            title: t('Team.title'),
            href: `/${locale}/${tenant}/team`,
            icon: Users,
            active: pathname === `/${locale}/${tenant}/team`,
            roles: ['admin'],
          },
          {
            title: t('billing.title'),
            href: `/${locale}/${tenant}/billing`,
            icon: CreditCard,
            active: pathname === `/${locale}/${tenant}/billing`,
            roles: ['admin'],
          },
          {
            title: t('Settings.title'),
            href: `/${locale}/${tenant}/settings`,
            icon: Settings,
            active: pathname === `/${locale}/${tenant}/settings`,
            roles: ['user', 'admin'],
          },
        ],
      },
    ],
  };

  // Filter out items based on user role
  const filteredNavGroups = sidebarData.navGroups.map(group => {
    const filteredItems = group.items.filter(item => {
      if (!item.roles) return true;
      return item.roles.includes(role);
    });
    return { ...group, items: filteredItems };
  }).filter(group => group.items.length > 0);

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon" variant="floating">
        <SidebarHeader>
          <TeamSwitcher />
        </SidebarHeader>
        <SidebarContent>
          {filteredNavGroups.map((props) => (
            <NavGroup key={props.title} {...props} />
          ))}
        </SidebarContent>
        <SidebarFooter>
          <NavUser
            user={{
              name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              email: user.email || '',
              avatar: user.user_metadata?.avatar_url || undefined,
            }}
          />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </SidebarProvider>
  );
}
