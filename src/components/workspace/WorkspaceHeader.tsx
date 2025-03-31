import { cookies } from 'next/headers';
import { Suspense } from 'react';

import { ThemeToggleStatic } from '@/components/theme/ThemeToggleStatic';
import { UserProfileDropdown } from '@/components/user/profile/UserProfileDropdown';
import { WorkspaceHeaderClient } from '@/components/workspace/WorkspaceHeaderClient';
import { User } from '@/types/auth/user';

interface WorkspaceHeaderProps {
  className?: string;
  fixed?: boolean;
  user?: User | null;
}

const HEADER_COOKIE_NAME = 'header:state';

export async function WorkspaceHeader({
  className = '',
  fixed = false,
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
      user={user}
      initialHeaderState={initialHeaderState}
    >
      <Suspense fallback={<div className="h-8 w-8 bg-muted/30 rounded-md animate-pulse" />}>
        <ThemeToggleStatic />
      </Suspense>
      <Suspense fallback={<div className="h-8 w-8 bg-muted/30 rounded-full animate-pulse" />}>
        <UserProfileDropdown user={user || null} />
      </Suspense>
    </WorkspaceHeaderClient>
  );
}
