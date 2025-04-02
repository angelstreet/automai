import { ReactNode } from 'react';
import { WithPageMetadata } from '@/components/layout/PageMetadata';
import { SettingsContent as ClientSettingsContent } from './client/SettingsContent';

interface SettingsContentProps extends WithPageMetadata {}

/**
 * Server component wrapper for SettingsContent
 * Follows React Server Component pattern
 */
export function SettingsContent({ pageMetadata }: SettingsContentProps = {}) {
  return <ClientSettingsContent />;
}
