import { ReactNode } from 'react';
import { getCICDProviders } from '@/app/actions/cicdAction';
import { WithPageMetadata } from '@/components/layout/PageMetadata';

import CICDDetailsClient from './client/CICDDetailsClient';

interface CICDContentProps extends WithPageMetadata {}

export default async function CICDContent({ pageMetadata }: CICDContentProps = {}) {
  const providersResponse = await getCICDProviders();
  const providers = providersResponse.success ? providersResponse.data || [] : [];

  return (
    <div className="w-full border-0 shadow-none">
      <CICDDetailsClient initialProviders={providers} removeTitle={true} />
    </div>
  );
}
