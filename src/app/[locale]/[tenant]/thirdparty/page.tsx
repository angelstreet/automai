import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { ThirdPartyPageContent } from './_components/ThirdPartyPageContent';

export default async function ThirdPartyPage() {
  const t = await getTranslations('thirdparty');

  return (
    <FeaturePageContainer title={t('title')} description={t('desc')}>
      <ThirdPartyPageContent />
    </FeaturePageContainer>
  );
}
