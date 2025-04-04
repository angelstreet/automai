import { getCICDProviders } from '@/app/actions/cicdAction';
import CICDTableClient from './client/CICDTableClient';

export default async function CICDContent() {
  console.log('[@component:CICDContent:render] Fetching providers on server');
  const providersResponse = await getCICDProviders();
  const providers = providersResponse.success ? providersResponse.data || [] : [];

  if (!providersResponse.success) {
    console.error(`[@component:CICDContent:render] Error: ${providersResponse.error}`);
  }

  return (
    <div className="w-full border-0 shadow-none">
      <CICDTableClient initialProviders={providers} />
    </div>
  );
}
