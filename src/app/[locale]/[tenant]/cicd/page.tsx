import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/layout/PageHeader';
import CICDContent from './_components/CICDContent';
import CICDSkeleton from './_components/CICDSkeleton';
import { CICDActions } from './_components/client/CICDActions';
import Script from 'next/script';

export default async function CICDPage() {
  const t = await getTranslations('cicd');

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex flex-col gap-4">
        <PageHeader
          title={t('title') || 'CI/CD Integration'}
          description={t('description') || 'Configure CI/CD providers for automated deployments'}
        >
          <CICDActions />
        </PageHeader>

        <Suspense fallback={<CICDSkeleton />}>
          <CICDContent />
        </Suspense>
      </div>
      
      {/* Script to handle custom event for opening provider dialog */}
      <Script id="open-provider-dialog-handler">
        {`
          document.addEventListener('open-provider-dialog', () => {
            // Find the Add Provider button by ID and click it
            const addButton = document.getElementById('add-provider-button');
            if (addButton) {
              addButton.click();
            }
          });
        `}
      </Script>
    </div>
  );
}
