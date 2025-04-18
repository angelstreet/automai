import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { SettingsContent, SettingsSkeleton } from './_components';

export default async function SettingsPage() {
  const t = await getTranslations('settings');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer
      title={t('title') || 'Settings'}
      description={t('desc') || 'Manage your account settings'}
    >
      <Suspense fallback={<SettingsSkeleton />}>
        <SettingsContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
