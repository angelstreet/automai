import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import ThirdPartyContent from './_components/ThirdPartyContent';

export default async function ThirdPartyPage() {
  const t = await getTranslations('thirdparty');

  // Using direct FeaturePageContainer approach
  return (
    <FeaturePageContainer title={t('title')} description={t('desc')} actions={null}>
      <ThirdPartyContent />
    </FeaturePageContainer>
  );
}
