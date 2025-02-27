'use client';

import * as React from 'react';
import { ChevronDown, Code2, Building2, Factory } from 'lucide-react';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { useUser } from '@/lib/contexts/UserContext';

interface TeamSwitcherProps {
  teams?: {
    name: string;
    logo: React.ElementType;
    plan: string;
  }[];
}

// Example teams data
const defaultTeams = [
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
];

export function TeamSwitcher({ teams = defaultTeams }: TeamSwitcherProps) {
  const [activeTeam, setActiveTeam] = React.useState(teams[0]);
  const { state } = useSidebar();
  const { user } = useUser();
  const Icon = activeTeam.logo;
  const isCollapsed = state === 'collapsed';

  // Only show for pro users or users with a tenant
  if (!user || (user.plan !== 'PRO' && !user.tenantId)) {
    return null;
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild disabled={isCollapsed}>
            <SidebarMenuButton
              size="lg"
              className="relative h-[52px] w-full justify-start gap-4 px-4 hover:bg-accent/50 data-[state=open]:bg-accent/50"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex flex-col items-start gap-1">
                <p className="text-sm font-medium leading-none">{activeTeam.name}</p>
                <p className="text-xs text-muted-foreground">{activeTeam.plan}</p>
              </div>
              {!isCollapsed && (
                <ChevronDown className="absolute right-4 top-[19px] h-4 w-4 shrink-0 opacity-50" />
              )}
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" sideOffset={12} className="w-[200px]">
            <DropdownMenuLabel className="text-xs font-normal">Switch Team</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {teams.map((team) => {
              const TeamIcon = team.logo;
              return (
                <DropdownMenuItem
                  key={team.name}
                  onClick={() => setActiveTeam(team)}
                  className="flex items-center gap-4 px-2 py-2"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <TeamIcon className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <p className="text-sm font-medium leading-none">{team.name}</p>
                    <p className="text-xs text-muted-foreground">{team.plan}</p>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
