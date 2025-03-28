import { User } from '@/types/user';
import { UserProfile } from './UserProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/shadcn/avatar';
import { UserIcon } from 'lucide-react';
import { cache } from 'react';

export interface UserProfileWrapperProps {
  user?: User | null;
  clearCache?: () => Promise<void>;
}

// Cache the user data and avatar at the server component level
const getPreloadedUserData = cache((user?: User | null) => {
  if (!user) return null;

  const userName = user?.name || user?.email?.split('@')[0] || 'Guest';
  const avatarSrc = user?.user_metadata?.avatar_url || '/avatars/default.svg';
  const initials = userName
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return {
    userName,
    avatarSrc,
    initials,
  };
});

/**
 * Server component wrapper for UserProfile
 * This allows for better prerendering and suspense in server components
 */
export function UserProfileWrapper({ user, clearCache }: UserProfileWrapperProps) {
  // Preload and cache user data on the server
  const userData = getPreloadedUserData(user);

  // Pre-cache the avatar image if possible
  if (userData?.avatarSrc) {
    // This is a hint to the browser to preload the image
    return (
      <>
        <link rel="preload" href={userData.avatarSrc} as="image" fetchPriority="high" />
        <UserProfile user={user} clearCache={clearCache} />
      </>
    );
  }

  return <UserProfile user={user} clearCache={clearCache} />;
}
