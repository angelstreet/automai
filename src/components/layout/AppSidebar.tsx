import { User } from '@/types/user';
import { AppSidebarClient } from './client/AppSidebarClient';

interface AppSidebarProps {
  user?: User | null;
}

export function AppSidebar({ user }: AppSidebarProps) {
  return <AppSidebarClient user={user} />;
}
