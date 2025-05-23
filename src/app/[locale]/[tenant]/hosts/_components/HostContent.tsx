import { getHosts } from '@/app/actions/hostsAction';

import { HostContentClient } from './client/HostContentClient';

/**
 * Server component for fetching host data
 * Fetches initial host data and passes it to the client component
 */
export default async function HostContent() {
  // Fetch hosts directly in the server component
  const hostsResponse = await getHosts();
  const hosts = hostsResponse.success ? hostsResponse.data || [] : [];

  return <HostContentClient initialHosts={hosts} />;
}
