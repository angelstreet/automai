
import { ProfileContent as ClientProfileContent } from './client/ProfileContent';


/**
 * Server component wrapper for ProfileContent
 * Allows passing server-fetched data to client component
 */
export function ProfileContent({ user }: ProfileContentProps) {
  return <ClientProfileContent user={user} />;
}
