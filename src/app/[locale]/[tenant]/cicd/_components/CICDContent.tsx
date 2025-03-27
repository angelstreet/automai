import { Button } from '@/components/shadcn/button';
import { PlusCircle } from 'lucide-react';
import { getCICDProviders } from '@/app/actions/cicd';
import ClientCICDProvider from './client/ClientCICDProvider';

export default async function CICDContent() {
  // Fetch CICD providers directly in the server component
  const providersResponse = await getCICDProviders();
  const providers = providersResponse.success ? providersResponse.data || [] : [];

  return (
    <div className="flex flex-col gap-4">
      <ClientCICDProvider initialProviders={providers} removeTitle={true} />
    </div>
  );
}
