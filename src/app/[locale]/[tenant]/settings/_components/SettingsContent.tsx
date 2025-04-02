import { SettingsContent as ClientSettingsContent } from './client/SettingsContent';

/**
 * Server component wrapper for SettingsContent
 * Follows React Server Component pattern
 */
export function SettingsContent() {
  return <ClientSettingsContent />;
}
