import { User } from '@/types/user';
import { cache } from 'react';
import { UserProfileDropdown } from './client/UserProfileDropdown';

export interface UserProfileWrapperProps {
  user: User;
  clearCache?: () => Promise<void>;
}

/**
 * Server component wrapper for UserProfileDropdown
 * Preloads avatar data and passes user info to client component
 */
export function UserProfileWrapper({ user, clearCache }: UserProfileWrapperProps) {
  // When user has an avatar, preload it
  const avatarUrl = user?.avatar_url || user?.user_metadata?.avatar_url;
  
  if (avatarUrl) {
    return (
      <>
        <link rel="preload" href={avatarUrl} as="image" fetchPriority="high" />
        <UserProfileDropdown user={user} clearCache={clearCache} />
      </>
    );
  }

  return <UserProfileDropdown user={user} clearCache={clearCache} />;
}