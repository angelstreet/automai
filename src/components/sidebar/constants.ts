/**
 * Sidebar constants
 * Contains all constants related to the sidebar component
 */

import {
  LayoutDashboard,
  Rocket,
  BarChart3,
  Settings,
  Users,
  Building,
  Server,
  GitBranch,
} from 'lucide-react';

import { Role } from '@/types/service/userServiceType';

// Sidebar width and sizing
// IMPORTANT: These values should match the CSS variables in globals.css
// --sidebar-width and --sidebar-width-icon
export const SIDEBAR_COOKIE_NAME = 'automai_sidebar_state';
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Legacy values - retained for backward compatibility
export const SIDEBAR_WIDTH = '14.5rem';
export const SIDEBAR_WIDTH_ICON = '4rem';

// Current values - MUST match the CSS variables in globals.css
export const APP_SIDEBAR_WIDTH = '14rem';
export const APP_SIDEBAR_WIDTH_ICON = '2.6rem';

export const SIDEBAR_WIDTH_MOBILE = '16rem';
export const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

// Sidebar navigation structure
export type SidebarItemType = {
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
};

export type SidebarNavigationData = {
  groups: {
    title: string;
    items: SidebarItemType[];
  }[];
};

export const sidebarNavigationData: SidebarNavigationData = {
  groups: [
    {
      title: 'Overview',
      items: [
        {
          title: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboard,
          roles: ['admin', 'developer', 'tester', 'viewer'],
        },
      ],
    },
    {
      title: 'Main',
      items: [
        {
          title: 'Deployment',
          href: '/deployment',
          icon: Rocket,
          roles: ['admin', 'developer', 'tester'],
        },
        {
          title: 'Reports',
          href: '/reports',
          icon: BarChart3,
          roles: ['admin', 'developer', 'tester', 'viewer'],
        },
      ],
    },
    {
      title: 'Environment',
      items: [
        {
          title: 'Hosts',
          href: '/hosts',
          icon: Server,
          roles: ['admin', 'developer', 'tester'],
        },
        {
          title: 'Repositories',
          href: '/repositories',
          icon: GitBranch,
          roles: ['admin', 'developer'],
        },
      ],
    },
    {
      title: 'Admin',
      items: [
        {
          title: 'Settings',
          href: '/settings',
          icon: Settings,
          roles: ['admin'],
        },
        {
          title: 'Team',
          href: '/team',
          icon: Users,
          roles: ['admin'],
        },
        {
          title: 'Billing',
          href: '/billing',
          icon: Building,
          roles: ['admin'],
        },
      ],
    },
  ],
};
