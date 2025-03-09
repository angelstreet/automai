'use client';

import { ChevronDown, Code2, Building2, Factory } from 'lucide-react';
import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';

import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/shadcn/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useTenants } from '@/hooks/useTenants';

export function TeamSwitcher() {
  const { user } = useAuth();
  const { tenants, isLoading, currentTenant, switchTenant } = useTenants();
  const { isOpen } = useSidebar();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as string;

  if (!user || isLoading || tenants.length === 0) {
    return null;
  }

  const handleTenantSwitch = async (tenantId: string) => {
    await switchTenant(tenantId);
    router.push(`/${locale}/${tenantId}/dashboard`);
  };

  return !isOpen ? (
    <SidebarMenu>
      <SidebarMenuButton>
        {currentTenant?.iconName ? getIconComponent(currentTenant.iconName) : <Building2 className="h-4 w-4" />}
      </SidebarMenuButton>
      {tenants.map((tenant) => (
        <SidebarMenuItem
          key={tenant.id}
          onClick={() => handleTenantSwitch(tenant.id)}
          className={tenant.id === currentTenant?.id ? "bg-accent" : ""}
        >
          {tenant.iconName ? getIconComponent(tenant.iconName) : <Building2 className="h-4 w-4" />}
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-lg border p-4 hover:bg-accent">
          <div className="flex items-center gap-3">
            {currentTenant?.iconName ? getIconComponent(currentTenant.iconName) : <Building2 className="h-4 w-4" />}
            <span className="text-sm font-medium">{currentTenant?.name || 'Default'}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" side="right" forceMount>
        <DropdownMenuLabel>Switch team</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleTenantSwitch(tenant.id)}
          >
            {tenant.iconName ? getIconComponent(tenant.iconName) : <Building2 className="mr-2 h-4 w-4" />}
            <span>{tenant.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Helper function to get icon component based on iconName
function getIconComponent(iconName: string) {
  switch (iconName) {
    case 'building':
      return <Building2 className="h-4 w-4" />;
    case 'code':
      return <Code2 className="h-4 w-4" />;
    case 'factory':
      return <Factory className="h-4 w-4" />;
    default:
      return <Building2 className="h-4 w-4" />;
  }
}
