import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { User } from '@/types/user';
import { WorkspaceHeaderClient } from './client/WorkspaceHeaderClient';
import { ThemeToggleWrapper } from '@/components/theme/ThemeToggleWrapper';
import { UserProfileWrapper } from '@/components/profile/UserProfileWrapper';

interface WorkspaceHeaderProps {
  className?: string;
  fixed?: boolean;
  tenant?: string;
  user?: User | null;
}

const HEADER_COOKIE_NAME = 'header:state';

export async function WorkspaceHeader({
  className = '',
  fixed = false,
  tenant,
  user,
}: WorkspaceHeaderProps) {
  // Get the header visibility state from cookies on the server
  const cookieStore = await cookies();
  const headerVisibilityCookie = await cookieStore.get(HEADER_COOKIE_NAME);
  const initialHeaderState = headerVisibilityCookie?.value !== 'hidden';

  return (
    <WorkspaceHeaderClient
      className={className}
      fixed={fixed}
      tenant={tenant}
      user={user}
      initialHeaderState={initialHeaderState}
    >
      <Suspense fallback={<div className="h-8 w-8 bg-muted/30 rounded-md animate-pulse" />}>
        <ThemeToggleWrapper />
      </Suspense>
      <Suspense fallback={<div className="h-8 w-8 bg-muted/30 rounded-full animate-pulse" />}>
        <UserProfileWrapper tenant={tenant} user={user} />
      </Suspense>
    </WorkspaceHeaderClient>
  );
}
