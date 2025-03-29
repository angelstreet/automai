import { User } from '@/types/user';

import { AppSidebarClient } from '@/components/navigation/AppSidebarClient';

interface AppSidebarProps {
  user?: User | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  return <AppSidebarClient user={user} />;
}
