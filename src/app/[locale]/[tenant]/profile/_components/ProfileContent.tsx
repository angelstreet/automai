import { ProfileContent as ClientProfileContent } from './client/ProfileContent';

/**
 * Server component wrapper for ProfileContent
 * Allows passing server-fetched data to client component
 */
interface ProfileContentProps {
  user: any; // Replace 'any' with the actual user type if available
}

export function ProfileContent({ user }: ProfileContentProps) {
  return <ClientProfileContent user={user} />;
}
