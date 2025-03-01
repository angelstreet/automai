import { getHosts } from '@/lib/services/hosts';
import { HostsPageClient } from './_components/HostsPageClient';

export default async function HostsPage() {
  const hosts = await getHosts();
  return <HostsPageClient initialHosts={hosts} />;
}
