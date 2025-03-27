import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';
import { BillingContent, BillingSkeleton } from './_components';
import { BillingActions } from './_components/client/BillingActions';

export const metadata: Metadata = {
  title: 'Billing & Plans',
  description: 'Manage your billing and subscription plans',
};

export default async function BillingPage() {
  const t = await getTranslations('billing');
  
  return (
    <FeaturePageContainer
      title={t('title')}
      description={t('description')}
      actions={<BillingActions />}
    >
      <Suspense fallback={<BillingSkeleton />}>
        <BillingContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
