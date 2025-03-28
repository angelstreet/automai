import { User } from '@/types/user';
import { cache } from 'react';
import { UserProfileDropdown } from './client/UserProfileDropdown';

export interface UserProfileWrapperProps {
  user: User | null;
  clearCache?: () => Promise<void>;
}

/**
 * Server component wrapper for UserProfileDropdown
 * Preloads avatar data and passes user info to client component
 */
export function UserProfileWrapper({ user, clearCache }: UserProfileWrapperProps) {
  // Handle null user case
  if (!user) {
    return <UserProfileDropdown user={null as unknown as User} clearCache={clearCache} />;
  }
  
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