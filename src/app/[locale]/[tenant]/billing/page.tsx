import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Metadata } from 'next';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';
import { BillingContent, BillingSkeleton } from './_components';
import { BillingActions } from './_components/client/BillingActions';
import { PageHeader } from '@/components/layout/PageHeader';

export const metadata: Metadata = {
  title: 'Billing & Plans',
  description: 'Manage your billing and subscription plans',
};

export default async function BillingPage() {
  const t = await getTranslations('billing');
  
  return (
    <div className="container mx-auto py-6 px-4">
    <PageHeader title={t('title')} description={t('description')} />
      <Suspense fallback={<BillingSkeleton />}>
        <BillingContent />
      </Suspense>
    </div>
  );
}
