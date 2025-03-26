import { Button } from '@/components/shadcn/button';
import { PlusCircle } from 'lucide-react';
import { getCICDProviders } from '@/app/actions/cicd';
import ClientCICDProvider from './client/ClientCICDProvider';
import { unstable_cache } from 'next/cache';

// Cache the providers fetch with a 5-minute TTL
const getCachedProviders = unstable_cache(
  async (tenantId: string) => {
    const providersResponse = await getCICDProviders();
    return providersResponse.success ? providersResponse.data || [] : [];
  },
  ['cicd-providers'],
  {
    revalidate: 300, // 5 minutes
    tags: ['cicd-providers']
  }
);

export default async function CICDContent() {
  // Get providers with caching
  const providers = await getCachedProviders();
  
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