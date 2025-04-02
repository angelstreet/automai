import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { BillingContent, BillingSkeleton } from './_components';

export default async function BillingPage() {
  const t = await getTranslations('billing');

  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingContent 
        pageMetadata={{
          title: t('title'), 
          description: t('description')
        }} 
      />
    </Suspense>
  );
}
