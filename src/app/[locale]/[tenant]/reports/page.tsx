import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';
import { ReportsContent } from './_components/ReportsContent';

export default async function ReportsPage() {
  const t = await getTranslations('reports');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer title={t('title')} description={t('desc')}>
      <ReportsContent />
    </FeaturePageContainer>
  );
}
