import { User } from '@/types/auth/user';

import { AppSidebarClient } from '@/components/sidebar/AppSidebarClient';

interface AppSidebarProps {
  user?: User | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  return <AppSidebarClient user={user} />;
}
