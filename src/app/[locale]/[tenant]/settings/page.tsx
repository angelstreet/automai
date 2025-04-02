import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { SettingsContent, SettingsSkeleton } from './_components';

export default async function SettingsPage() {
  const t = await getTranslations('Settings');
  
  // Using pageMetadata that will be automatically extracted by FeaturePageContainer
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsContent 
        pageMetadata={{
          title: t('title') || 'Settings',
          description: t('description') || 'Manage your account settings'
        }}
      />
    </Suspense>
  );
}
