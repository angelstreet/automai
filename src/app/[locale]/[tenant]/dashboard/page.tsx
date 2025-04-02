import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { DashboardTabsClient } from './_components/client/DashboardTabsClient';

export default async function DashboardPage() {
  const t = await getTranslations('Dashboard');
  return (
    <FeaturePageContainer title={t('title')} description={''} actions={null}>
      <DashboardTabsClient />
    </FeaturePageContainer>
  );
}
