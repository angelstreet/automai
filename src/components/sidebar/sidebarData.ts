import {
  LayoutDashboard,
  Code2,
  Rocket,
  BarChart3,
  Settings,
  Users,
  Building,
  Factory,
  Server,
  GitBranch,
} from 'lucide-react';

import { Role } from '@/types/auth/user';

export type SidebarData = {
  user: {
    name: string;
    email: string;
    avatar?: string;
  };
  teams: {
    name: string;
    logo: any;
    plan: string;
  }[];
  navGroups: {
    title: string;
    items: {
      title: string;
      href: string;
      icon: any;
      roles?: Role[];
      items?: {
        title: string;
        href: string;
        icon: any;
        roles?: Role[];
      }[];
    }[];
  }[];
};

export const sidebarData: SidebarData = {
  user: {
    name: 'User',
    email: 'user@example.com',
  },
  teams: [
    {
      name: 'TeamA',
      logo: Code2,
      plan: 'fr',
    },
    {
      name: 'Team B',
      logo: Building,
      plan: 'swi',
    },
    {
      name: 'Team C',
      logo: Factory,
      plan: 'us',
    },
  ],
  navGroups: [
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
          title: 'CI/CD',
          href: '/cicd',
          icon: GitBranch,
          roles: ['admin', 'developer'],
        },
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
