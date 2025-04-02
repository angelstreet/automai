import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

export default async function ReportsPage() {
  const t = await getTranslations('Reports');
  return (
    <FeaturePageContainer title={t('title')} description={t('description')} actions={null}>
      return (
      <div className="p-4">
        <p>Reports will be available here.</p>
      </div>
      );
    </FeaturePageContainer>
  );
}
