import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';

import { BillingContent, BillingSkeleton } from './_components';

export default async function BillingPage() {
  const t = await getTranslations('billing');

  return (
    <div className="container mx-auto py-4 px-4">
      <PageHeader title={t('title')} description={t('description')} />
      <Suspense fallback={<BillingSkeleton />}>
        <BillingContent />
      </Suspense>
    </div>
  );
}
