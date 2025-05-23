import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import CodeContent from './_components/CodeContent';

export default async function CodePage() {
  const t = await getTranslations('code');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer title={t('title')} description={t('desc')} actions={null}>
      <CodeContent />
    </FeaturePageContainer>
  );
}
