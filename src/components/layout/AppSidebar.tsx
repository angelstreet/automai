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
  const [isOpen, setIsOpen] = useState(false);
  const { role } = useRole();

  // If no user is provided, show a minimal sidebar with limited functionality
  if (!user) {
    console.warn('AppSidebar: No user data provided');
  }

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const sidebarItems = [
    {
      name: t('Dashboard.title'),
      href: `/${locale}/${tenant}/dashboard`,
      icon: LayoutDashboard,
      roles: ['user', 'admin'],
    },
    {
      name: t('Projects.projects'),
      href: `/${locale}/${tenant}/projects`,
      icon: FolderKanban,
      roles: ['user', 'admin'],
    },
    {
      name: t('Common.hosts'),
      href: `/${locale}/${tenant}/hosts`,
      icon: Server,
      roles: ['user', 'admin'],
    },
    {
      name: t('Common.terminal'),
      href: `/${locale}/${tenant}/terminals`,
      icon: Terminal,
      roles: ['user', 'admin'],
    },
    {
      name: t('repositories.repositories'),
      href: `/${locale}/${tenant}/repositories`,
      icon: GitBranch,
      roles: ['user', 'admin'],
    },
    {
      name: 'Scripts',
      href: `/${locale}/${tenant}/scripts`,
      icon: FileCode,
      roles: ['user', 'admin'],
    },
    {
      name: 'Tests',
      href: `/${locale}/${tenant}/tests`,
      icon: TestTube,
      roles: ['user', 'admin'],
    },
    {
      name: 'Reports',
      href: `/${locale}/${tenant}/reports`,
      icon: BarChart,
      roles: ['user', 'admin'],
    },
    {
      name: t('Team.title'),
      href: `/${locale}/${tenant}/team`,
      icon: Users,
      roles: ['admin'],
    },
    {
      name: t('billing.title'),
      href: `/${locale}/${tenant}/billing`,
      icon: CreditCard,
      roles: ['admin'],
    },
    {
      name: t('Settings.title'),
      href: `/${locale}/${tenant}/settings`,
      icon: Settings,
      roles: ['user', 'admin'],
    },
  ].filter(item => item.roles.includes(role));

  return (
    <SidebarProvider open={isOpen} onOpenChange={setIsOpen}>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center justify-between px-4">
            <Link
              href={`/${locale}/${tenant}/dashboard`}
              className="flex items-center space-x-2"
            >
              <span className="font-bold">AutomAI</span>
            </Link>
            <button onClick={toggleSidebar} className="lg:hidden">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
          <TeamSwitcher />
        </SidebarHeader>
        <SidebarContent>
          <NavGroup
            title={t('Menu.title')}
            items={sidebarItems.map(item => ({
              title: item.name,
              href: item.href,
              icon: item.icon,
              active: pathname === item.href,
            }))}
          />
        </SidebarContent>
        <SidebarFooter>
          {user && (
            <NavUser 
              user={{ 
                name: user.user_metadata?.name || user.email || 'User', 
                email: user.email || '' 
              }} 
            />
          )}
        </SidebarFooter>
        <SidebarRail>
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-lg hover:bg-accent',
                pathname === item.href && 'bg-accent',
              )}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          ))}
        </SidebarRail>
      </Sidebar>
    </SidebarProvider>
  );
}
