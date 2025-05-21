import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import BrowserContent from './_components/RecContent';

export default async function RecPage() {
  const t = await getTranslations('rec');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer title={t('title')} description={t('desc')} actions={null}>
      <BrowserContent />
    </FeaturePageContainer>
  );
}
