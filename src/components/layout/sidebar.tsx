'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Bot,
  Code,
  Home,
  LayoutDashboard,
  Settings,
  TestTube2,
} from 'lucide-react';

interface SidebarProps {
  expanded: boolean;
  onToggle: () => void;
}

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Code, label: 'Scripts', href: '/scripts' },
  { icon: TestTube2, label: 'Test Cases', href: '/test-cases' },
  { icon: Bot, label: 'AI Assistant', href: '/ai-assistant' },
  { icon: Settings, label: 'Settings', href: '/settings' },
];

export function Sidebar({ expanded, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        'flex h-screen flex-col border-r bg-background transition-all duration-300',
        expanded ? 'w-64' : 'w-16'
      )}
    >
      <div className="flex h-14 items-center border-b px-4">
        <button
          onClick={onToggle}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 h-9 w-9"
        >
          <Home className="h-5 w-5" />
          {expanded && (
            <span className="ml-2 text-sm font-semibold">Automai</span>
          )}
        </button>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {expanded && <span className="ml-3">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
} 