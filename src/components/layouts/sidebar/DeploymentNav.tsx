import { 
  Activity, 
  CircuitBoard, 
  Database, 
  GitBranch, 
  History, 
  RefreshCw, 
  Rocket, 
  Settings as SettingsIcon 
} from 'lucide-react';
import { SidebarNavItem } from './NavItem';

export const deploymentNavItems: SidebarNavItem[] = [
  {
    title: 'Overview',
    href: '/deployment',
    icon: Activity,
    isIndex: true,
  },
  {
    title: 'Deployments',
    href: '/deployment/list',
    icon: Rocket,
  },
  {
    title: 'CI/CD',
    href: '/deployment/cicd',
    icon: RefreshCw,
  },
  {
    title: 'Hosts',
    href: '/deployment/hosts',
    icon: CircuitBoard,
  },
  {
    title: 'Repositories',
    href: '/deployment/repositories',
    icon: GitBranch,
  },
  {
    title: 'Database',
    href: '/deployment/database',
    icon: Database,
  },
  {
    title: 'History',
    href: '/deployment/history',
    icon: History,
  },
  {
    title: 'Settings',
    href: '/deployment/settings',
    icon: SettingsIcon,
  },
]; 