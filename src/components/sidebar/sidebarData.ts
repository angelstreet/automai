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
  CheckSquare,
} from 'lucide-react';

import { Role } from '@/types/service/userServiceType';

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

