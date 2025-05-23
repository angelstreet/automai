import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import IssuesContent from './_components/IssuesContent';

export default async function BrowserPage() {
  const t = await getTranslations('browser');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer title={t('title')} description={t('desc')} actions={null}>
      <IssuesContent />
    </FeaturePageContainer>
  );
}
