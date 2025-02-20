# Phase 1: Layout Implementation Instructions

## Status Indicators
🔴 Not Started | 🟡 In Progress | 🟢 Completed

## 1. Create Layout Components Structure 🔴
```bash
mkdir -p src/components/layout/sidebar
mkdir -p src/components/layout/header
mkdir -p src/components/ui
```

Create base files:
```bash
touch src/components/layout/sidebar/index.tsx
touch src/components/layout/sidebar/sidebar-item.tsx
touch src/components/layout/header/index.tsx
touch src/components/layout/header/breadcrumb.tsx
touch src/components/ui/role-switcher.tsx
touch src/components/ui/theme-toggle.tsx
touch src/components/ui/user-nav.tsx
```

## 2. Setup Types 🔴
Create src/types/index.d.ts:
```typescript
export type Role = 'admin' | 'developer' | 'tester' | 'viewer';

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  href: string;
  roles?: Role[];
  submenu?: MenuItem[];
}

export interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
  items: MenuItem[];
}

export interface BreadcrumbItem {
  label: string;
  href: string;
}
```

## 3. Implement Sidebar Components 🔴

1. Create sidebar context (src/components/layout/sidebar/sidebar-context.tsx):
```typescript
import { createContext, useContext, useState } from 'react';

interface SidebarContextProps {
  expanded: boolean;
  toggleSidebar: () => void;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: React.ReactNode }) => {
  const [expanded, setExpanded] = useState(true);
  
  return (
    <SidebarContext.Provider value={{
      expanded,
      toggleSidebar: () => setExpanded(prev => !prev)
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within SidebarProvider');
  return context;
};
```

2. Create sidebar menu data (src/config/menu.ts):
```typescript
import { MenuItem } from '@/types';
import { Home, Code, Rocket, Monitor, BarChart2, Users, Settings } from 'lucide-react';

export const menuItems: MenuItem[] = [
  {
    icon: Home,
    label: 'Dashboard',
    href: '/dashboard'
  },
  {
    icon: Code,
    label: 'Scripts',
    href: '/scripts',
    roles: ['admin', 'developer', 'tester']
  },
  {
    icon: Rocket,
    label: 'Deployments',
    href: '/deployments',
    roles: ['admin', 'developer', 'tester']
  },
  {
    icon: Monitor,
    label: 'Devices',
    href: '/devices',
    roles: ['admin', 'developer', 'tester']
  },
  {
    icon: BarChart2,
    label: 'Reports',
    href: '/reports'
  },
  {
    icon: Users,
    label: 'Team',
    href: '/team',
    roles: ['admin']
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/settings',
    roles: ['admin']
  }
];
```

3. Implement sidebar item (src/components/layout/sidebar/sidebar-item.tsx):
```typescript
import { cn } from '@/lib/utils';
import { MenuItem } from '@/types';
import Link from 'next/link';
import { useSidebar } from './sidebar-context';
import { Tooltip } from '@/components/ui/tooltip';

interface SidebarItemProps {
  item: MenuItem;
  level?: number;
}

export const SidebarItem = ({ item, level = 0 }: SidebarItemProps) => {
  const { expanded } = useSidebar();
  const Icon = item.icon;

  const content = (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-gray-500 transition-all hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-50',
        'hover:bg-gray-100 dark:hover:bg-gray-800',
        level > 0 && 'ml-4'
      )}
    >
      <Icon className="h-4 w-4" />
      {expanded && <span>{item.label}</span>}
    </Link>
  );

  return expanded ? (
    content
  ) : (
    <Tooltip content={item.label}>{content}</Tooltip>
  );
};
```

4. Implement main sidebar (src/components/layout/sidebar/index.tsx):
```typescript
import { cn } from '@/lib/utils';
import { menuItems } from '@/config/menu';
import { SidebarItem } from './sidebar-item';
import { useSidebar } from './sidebar-context';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Sidebar = () => {
  const { expanded, toggleSidebar } = useSidebar();

  return (
    <nav
      className={cn(
        'flex flex-col border-r bg-white dark:bg-gray-950 transition-all duration-300',
        expanded ? 'w-64' : 'w-16'
      )}
    >
      <div className="p-4 flex justify-between items-center">
        {expanded && <span className="text-xl font-bold">Automai</span>}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="ml-auto"
        >
          {expanded ? <ChevronLeft /> : <ChevronRight />}
        </Button>
      </div>
      <div className="flex-1 px-3 py-2 space-y-1">
        {menuItems.map((item, i) => (
          <SidebarItem key={i} item={item} />
        ))}
      </div>
    </nav>
  );
};
```

## 4. Implement Header Components 🔴

1. Create user navigation (src/components/ui/user-nav.tsx):
```typescript
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export const UserNav = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <User className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Profile</DropdownMenuItem>
        <DropdownMenuItem>Settings</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
```

2. Create theme toggle (src/components/ui/theme-toggle.tsx):
```typescript
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
};
```

3. Create role switcher (src/components/ui/role-switcher.tsx):
```typescript
import { Role } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEffect, useState } from 'react';

const roles: Role[] = ['admin', 'developer', 'tester', 'viewer'];

export const RoleSwitcher = () => {
  const [role, setRole] = useState<Role>('admin');

  useEffect(() => {
    const savedRole = localStorage.getItem('userRole') as Role;
    if (savedRole) setRole(savedRole);
  }, []);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    localStorage.setItem('userRole', newRole);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Select value={role} onValueChange={handleRoleChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
```

4. Create header with breadcrumb (src/components/layout/header/index.tsx):
```typescript
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { UserNav } from '@/components/ui/user-nav';
import { Breadcrumb } from './breadcrumb';

export const Header = () => {
  return (
    <header className="border-b bg-white dark:bg-gray-950">
      <div className="flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Tenant Logo</span>
          <Breadcrumb />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
};
```

## 5. Create Workspace Layout 🔴

1. Create workspace layout (src/app/[locale]/[tenant]/layout.tsx):
```typescript
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { SidebarProvider } from '@/components/layout/sidebar/sidebar-context';
import { RoleSwitcher } from '@/components/ui/role-switcher';

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-auto p-4">
            {children}
          </main>
        </div>
      </div>
      <RoleSwitcher />
    </SidebarProvider>
  );
}
```

## Next Steps 🎯
After implementing these components:
1. Test the layout responsiveness
2. Verify theme switching works
3. Check role switcher persistence
4. Validate sidebar collapse/expand
5. Test breadcrumb navigation

Would you like to:
1. Start implementation?
2. Get more details about any component?
3. See the component hierarchy visualization?