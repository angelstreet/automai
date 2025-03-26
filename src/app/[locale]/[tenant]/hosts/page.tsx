'use client';

import { HostContextProvider } from '@/context';
import HostList from './_components/HostList';

// Create separate content component that safely uses the context
// This separates the context consumption from the provider wrapper
function HostsPageContent() {
  return <HostList />;
}

// Main exported page component that wraps the content with the provider
export default function HostsPage() {
  return (
    <HostContextProvider>
      <HostsPageContent />
    </HostContextProvider>
  );
}
