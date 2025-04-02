import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { DashboardContent } from './client/DashboardContent';

export default async function DashboardPage() {
  const t = await getTranslations('Dashboard');
  return (
    <FeaturePageContainer title={t('title')} description={t('description')} actions={null}>
      <DashboardContent />
    </FeaturePageContainer>
  );
}
