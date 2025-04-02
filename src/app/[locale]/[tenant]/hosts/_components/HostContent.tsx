import { ReactNode } from 'react';
import { getHosts } from '@/app/actions/hostsAction';
import { WithPageMetadata } from '@/components/layout/PageMetadata';

import ClientHostList from './client/ClientHostList';

interface HostContentProps extends WithPageMetadata {}

export default async function HostContent({ pageMetadata }: HostContentProps = {}) {
  // Fetch hosts directly in the server component
  const hostsResponse = await getHosts();
  const hosts = hostsResponse.success ? hostsResponse.data || [] : [];

  return <ClientHostList initialHosts={hosts} />;
}
