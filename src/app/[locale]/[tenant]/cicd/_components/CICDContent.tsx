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
      <div className="flex justify-end">
        <Button
          id="add-provider-button"
          size="sm"
          className="h-8 gap-1"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Add Provider</span>
        </Button>
      </div>
      
      <ClientCICDProvider 
        initialProviders={providers} 
        removeTitle={true} 
      />
    </div>
  );
}