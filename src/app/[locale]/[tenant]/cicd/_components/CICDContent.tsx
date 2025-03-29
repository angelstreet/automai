import { getCICDProviders } from '@/app/actions/cicd';

import ClientCICDProvider from './client/ClientCICDProvider';

export default async function CICDContent() {
  const providersResponse = await getCICDProviders();
  const providers = providersResponse.success ? providersResponse.data || [] : [];

  return (
    <div className="w-full border-0 shadow-none">
      <ClientCICDProvider initialProviders={providers} removeTitle={true} />
    </div>
  );
}
