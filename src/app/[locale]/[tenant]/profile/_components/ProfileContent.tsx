import { ReactNode } from 'react';
import { User } from '@/types/service/userServiceType';
import { WithPageMetadata } from '@/components/layout/PageMetadata';

import { ProfileContent as ClientProfileContent } from './client/ProfileContent';

interface ProfileContentProps extends WithPageMetadata {
  user?: User | null;
}

/**
 * Server component wrapper for ProfileContent
 * Allows passing server-fetched data to client component
 */
export function ProfileContent({ user, pageMetadata }: ProfileContentProps) {
  return <ClientProfileContent user={user} />;
}
