'use client';

import { useTranslations } from 'next-intl';
import { SettingsHeader } from '@/components/settings/SettingsHeader';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const t = useTranslations('Settings');

  return (
    <div className="container mx-auto py-6 space-y-8">
      <SettingsHeader title={t('title')} description={t('description')} />
      <div className="space-y-6">{children}</div>
    </div>
  );
}
