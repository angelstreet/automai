import { getTranslations } from 'next-intl/server';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { ThirdPartyActionsClient } from './_components/client/ThirdPartyActionsClient';
import { ThirdPartyContentClient } from './_components/client/ThirdPartyContentClient';

export default async function ThirdPartyPage() {
  const t = await getTranslations('thirdparty');

  // Using direct FeaturePageContainer approach like hosts page
  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('desc')}
      actions={<ThirdPartyActionsClient />}
    >
      <ThirdPartyContentClient />
    </FeaturePageContainer>
  );
}
