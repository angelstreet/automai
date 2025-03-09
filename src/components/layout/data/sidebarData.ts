/* eslint-disable */
import {
  LayoutDashboard,
  Code2,
  Rocket,
  Monitor,
  BarChart3,
  Settings,
  FileCode,
  TestTube,
  Users,
  Building,
  Factory,
  Server,
  GitBranch,
} from 'lucide-react';
import { Role } from '@/types/user';

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
      name: 'Automai',
      logo: Code2,
      plan: 'Trial',
    },
    {
      name: 'Acme Corp',
      logo: Building,
      plan: 'Pro',
    },
    {
      name: 'Monsters Inc',
      logo: Factory,
      plan: 'Enterprise',
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
          title: 'Development',
          href: '/development',
          icon: Code2,
          roles: ['admin', 'developer'],
          items: [
            { 
              title: 'Projects', 
              href: '/development/projects', 
              icon: FileCode,
              roles: ['admin', 'developer'],
            },
            { 
              title: 'Use Cases', 
              href: '/development/usecases', 
              icon: TestTube,
              roles: ['admin', 'developer'],
            },
          ],
        },
        {
          title: 'Repositories',
          href: '/repositories',
          icon: GitBranch,
          roles: ['admin', 'developer'],
        },
        {
          title: 'Tests',
          href: '/tests',
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
          title: 'Devices',
          href: '/devices',
          icon: Monitor,
          roles: ['admin', 'developer', 'tester'],
        },
        {
          title: 'Hosts',
          href: '/hosts',
          icon: Server,
          roles: ['admin', 'developer', 'tester'],
        },
        {
          title: 'Deployment',
          href: '/deployment',
          icon: Rocket,
          roles: ['admin', 'developer', 'tester'],
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
