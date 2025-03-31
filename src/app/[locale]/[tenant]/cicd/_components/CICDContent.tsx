import { getCICDProviders } from '@/app/actions/cicd';

import CICDDetailsClient from './client/CICDDetailsClient';

export default async function CICDContent() {
  const providersResponse = await getCICDProviders();
  const providers = providersResponse.success ? providersResponse.data || [] : [];

  return (
    <div className="w-full border-0 shadow-none">
      <CICDDetailsClient initialProviders={providers} removeTitle={true} />
    </div>
  );
}
