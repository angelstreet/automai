import { cookies } from 'next/headers';
import { User } from '@/types/user';
import { WorkspaceHeaderClient } from './client/WorkspaceHeaderClient';

interface WorkspaceHeaderProps {
  className?: string;
  fixed?: boolean;
  tenant?: string;
  user?: User | null;
}

const HEADER_COOKIE_NAME = 'header:state';

export function WorkspaceHeader({ className = '', fixed = false, tenant, user }: WorkspaceHeaderProps) {
  // Get the header visibility state from cookies on the server
  const cookieStore = cookies();
  const headerVisibilityCookie = cookieStore.get(HEADER_COOKIE_NAME);
  const initialHeaderState = headerVisibilityCookie?.value !== 'hidden';
  
  return (
    <WorkspaceHeaderClient 
      className={className}
      fixed={fixed}
      tenant={tenant}
      user={user}
      initialHeaderState={initialHeaderState}
    />
  );
}