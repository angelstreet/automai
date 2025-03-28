import { Suspense } from 'react';
import { ProfileContent as ClientProfileContent } from './client/ProfileContent';
import { User } from '@/types/user';

interface ProfileContentProps {
  user?: User | null;
}

/**
 * Server component wrapper for ProfileContent
 * Allows passing server-fetched data to client component
 */
export function ProfileContent({ user }: ProfileContentProps) {
  return <ClientProfileContent user={user} />;
}
