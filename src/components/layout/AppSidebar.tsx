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
  X
} from 'lucide-react';
import { useState } from 'react';

import { sidebarData } from './data/sidebarData';

interface AppSidebarProps {
  user: User | null;
  tenant: string;
  locale: string;
}

export function AppSidebar({ user, tenant, locale }: AppSidebarProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

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
    },
    {
      name: t('Common.hosts'),
      href: `/${locale}/${tenant}/hosts`,
      icon: Server,
    },
    {
      name: t('Common.terminal'),
      href: `/${locale}/${tenant}/terminals`,
      icon: Terminal,
    },
    {
      name: t('repositories.repositories'),
      href: `/${locale}/${tenant}/repositories`,
      icon: GitBranch,
    },
    {
      name: 'Scripts',
      href: `/${locale}/${tenant}/scripts`,
      icon: FileCode,
    },
    {
      name: 'Tests',
      href: `/${locale}/${tenant}/tests`,
      icon: TestTube,
    },
    {
      name: 'Reports',
      href: `/${locale}/${tenant}/reports`,
      icon: BarChart,
    },
    {
      name: t('Team.title'),
      href: `/${locale}/${tenant}/team`,
      icon: Users,
    },
    {
      name: t('billing.title'),
      href: `/${locale}/${tenant}/billing`,
      icon: CreditCard,
    },
    {
      name: t('Settings.title'),
      href: `/${locale}/${tenant}/settings`,
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className="fixed left-4 top-4 z-50 rounded-md bg-primary p-2 text-primary-foreground md:hidden"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 transform bg-card shadow-lg transition-transform duration-200 ease-in-out md:relative md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b px-4">
            <Link href={`/${locale}/${tenant}/dashboard`} className="flex items-center space-x-2">
              <span className="text-xl font-bold">Automai</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-2">
              {sidebarItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center rounded-md px-4 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                      pathname === item.href
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User info */}
          <div className="border-t p-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                {user?.user_metadata?.name ? user.user_metadata.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div>
                <p className="text-sm font-medium">{user?.user_metadata?.name || 'Guest User'}</p>
                <p className="text-xs text-muted-foreground">{user?.email || 'No email'}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
