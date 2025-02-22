'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Code2,
  Rocket,
  Monitor,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Globe,
  Smartphone,
  FileCode,
  TestTube,
  Flag,
  Calendar,
  Table,
  LineChart,
  Gauge,
  Users,
  Plug,
} from 'lucide-react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Role } from '@/components/ui/role-switcher';

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

type SubMenuItem = {
  icon: any;
  label: string;
  href: string;
};

type MenuItem = {
  icon: any;
  label: string;
  href?: string;
  roles: Role[];
  tooltip?: string;
  submenu?: SubMenuItem[];
};

const menuItems: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Dashboard',
    href: '/dashboard',
    roles: ['admin', 'developer', 'tester', 'viewer'],
  },
  {
    icon: Code2,
    label: 'Development',
    roles: ['admin', 'developer'],
    submenu: [
      { icon: FileCode, label: 'Projects', href: '/development/projects' },
      { icon: TestTube, label: 'Use Cases', href: '/development/usecases' },
      { icon: Flag, label: 'Campaigns', href: '/development/campaigns' },
    ]
  },
  {
    icon: Rocket,
    label: 'Execution',
    roles: ['admin', 'developer', 'tester'],
    submenu: [
      { icon: Calendar, label: 'Schedule', href: '/execution/schedule' },
      { icon: Table, label: 'Deployment', href: '/execution/deployment' },
    ]
  },
  {
    icon: Monitor,
    label: 'Devices',
    roles: ['admin', 'developer', 'tester'],
    submenu: [
      { icon: Globe, label: 'Web', href: '/devices/web' },
      { icon: Smartphone, label: 'Mobile', href: '/devices/mobile' },
    ]
  },
  {
    icon: BarChart3,
    label: 'Reports',
    roles: ['admin', 'developer', 'tester', 'viewer'],
    submenu: [
      { icon: LineChart, label: 'Results', href: '/reports/results' },
      { icon: Gauge, label: 'Performance', href: '/reports/metrics' },
    ]
  },
  {
    icon: Settings,
    label: 'Settings',
    roles: ['admin'],
    submenu: [
      { icon: Users, label: 'Team', href: '/settings/team' },
      { icon: Plug, label: 'Configuration', href: '/settings/configuration' },
      { icon: Plug, label: 'Integration', href: '/settings/integration' },
    ]
  },
];

function MenuItem({ 
  item, 
  expanded, 
  pathname, 
  params,
  currentRole,
}: { 
  item: MenuItem; 
  expanded: boolean; 
  pathname: string;
  params: any;
  currentRole: Role;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const hasSubmenu = item.submenu && item.submenu.length > 0;
  const isActive = item.href ? pathname.includes(item.href) : 
    item.submenu?.some(sub => pathname.includes(sub.href));

  // Check if the current role has access to this menu item
  if (!item.roles.includes(currentRole)) {
    return null;
  }

  const handleClick = () => {
    if (hasSubmenu) {
      setIsOpen(!isOpen);
    }
  };

  const content = (
    <div className={cn(
      'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground select-none',
      isActive ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
    )}>
      <item.icon className="h-5 w-5 flex-shrink-0" />
      {expanded && (
        <span className="ml-3 flex-1">{item.label}</span>
      )}
    </div>
  );

  const mainElement = hasSubmenu ? (
    <div 
      onClick={handleClick}
      className="cursor-pointer"
    >
      {content}
    </div>
  ) : item.href ? (
    <Link 
      href={`/${params.locale}/${params.tenant}${item.href}`}
    >
      {content}
    </Link>
  ) : content;

  const wrappedContent = expanded ? (
    mainElement
  ) : (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        {mainElement}
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center select-none">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );

  return hasSubmenu ? (
    <Collapsible 
      open={isOpen && expanded}
    >
      {wrappedContent}
      <CollapsibleContent 
        className="pl-6 pt-1"
      >
        {expanded && item.submenu?.map((subItem) => (
          <Link
            key={subItem.href}
            href={`/${params.locale}/${params.tenant}${subItem.href}`}
            className={cn(
              'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground select-none',
              pathname.includes(subItem.href) ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
            )}
          >
            <subItem.icon className="h-4 w-4 flex-shrink-0" />
            <span className="ml-3">{subItem.label}</span>
          </Link>
        ))}
      </CollapsibleContent>
    </Collapsible>
  ) : wrappedContent;
}

export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const [currentRole, setCurrentRole] = React.useState<Role>('admin');

  // Subscribe to role changes from the RoleSwitcher
  React.useEffect(() => {
    const handleRoleChange = (event: CustomEvent<Role>) => {
      setCurrentRole(event.detail);
    };

    window.addEventListener('roleChange' as any, handleRoleChange);
    return () => {
      window.removeEventListener('roleChange' as any, handleRoleChange);
    };
  }, []);

  return (
    <div
      className={cn(
        'flex h-screen flex-col border-r bg-background transition-all duration-300',
        expanded ? 'w-54' : 'w-16'
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        <Link 
          href={`/${params.locale}/${params.tenant}/dashboard`}
          className="flex items-center"
        >
          {expanded ? (
            <span className="text-lg font-semibold">Automai</span>
          ) : (
            <span className="text-lg font-semibold"></span>
          )}
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8"
        >
          {expanded ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => (
          <MenuItem
            key={item.label}
            item={item}
            expanded={expanded}
            pathname={pathname}
            params={params}
            currentRole={currentRole}
          />
        ))}
      </nav>
    </div>
  );
} 