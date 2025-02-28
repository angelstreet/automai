import {
  LayoutDashboard,
  Code2,
  Rocket,
  Monitor,
  BarChart3,
  Settings,
  FileCode,
  TestTube,
  Flag,
  Calendar,
  Table,
  LineChart,
  Gauge,
  Users,
  Plug,
  MessageSquare,
  CheckSquare,
  HelpCircle,
  Building2,
  Factory,
  Server,
} from 'lucide-react';

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
      roles?: string[];
      items?: {
        title: string;
        href: string;
        icon: any;
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
      logo: Building2,
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
            { title: 'Projects', href: '/development/projects', icon: FileCode },
            { title: 'Use Cases', href: '/development/usecases', icon: TestTube },
            { title: 'Campaigns', href: '/development/campaigns', icon: Flag },
          ],
        },
        {
          title: 'Execution',
          href: '/execution',
          icon: Rocket,
          roles: ['admin', 'developer', 'tester'],
          items: [
            { title: 'Schedule', href: '/execution/schedule', icon: Calendar },
            { title: 'Deployment', href: '/execution/deployment', icon: Table },
          ],
        },
        {
          title: 'Reports',
          href: '/reports',
          icon: BarChart3,
          roles: ['admin', 'developer', 'tester', 'viewer'],
          items: [
            { title: 'Results', href: '/reports/results', icon: LineChart },
            { title: 'Performance', href: '/reports/metrics', icon: Gauge },
          ],
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
      ],
    },
    {
      title: 'Features',
      items: [
        {
          title: 'Tasks',
          href: '/tasks',
          icon: CheckSquare,
          roles: ['admin', 'developer', 'tester', 'viewer'],
        },
        {
          title: 'Chats',
          href: '/chats',
          icon: MessageSquare,
          roles: ['admin', 'developer', 'tester', 'viewer'],
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          href: '/settings',
          icon: Settings,
          roles: ['admin'],
          items: [
            { title: 'Team', href: '/settings/team', icon: Users },
            { title: 'Configuration', href: '/settings/configuration', icon: Plug },
            { title: 'Integration', href: '/settings/integration', icon: Plug },
          ],
        },
        {
          title: 'Help Center',
          href: '/help',
          icon: HelpCircle,
          roles: ['admin', 'developer', 'tester', 'viewer'],
        },
      ],
    },
  ],
};
