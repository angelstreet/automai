'use client';

import { useTranslations } from 'next-intl';
import { HostContextProvider } from '@/context';
import HostList from './_components/HostList';
import { PageHeader } from '@/components/layout/PageHeader';

// Create separate content component that safely uses the context
// This separates the context consumption from the provider wrapper
function HostsPageContent() {
  const t = useTranslations('hosts');
  
  return (
    <div>
      <PageHeader title={t('hosts')} description={t('hosts_description')} />
      <HostList />
    </div>
  );
}

// Main exported page component that wraps the content with the provider
export default function HostsPage() {
  return (
    <HostContextProvider>
      <HostsPageContent />
    </HostContextProvider>
  );
}
