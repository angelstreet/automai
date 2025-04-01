import {  User  } from '@/types/service/userServiceType';

import { SidebarClient } from '@/components/sidebar/SidebarClient';

interface AppSidebarProps {
  user?: User | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  return <SidebarClient user={user} />;
}
