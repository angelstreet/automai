import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';

import { BillingContent, BillingSkeleton } from './_components';

export default async function BillingPage() {
  const t = await getTranslations('billing');

  return (
    <FeaturePageContainer title={t('title')} description={t('desc')}>
      <Suspense fallback={<BillingSkeleton />}>
        <BillingContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
