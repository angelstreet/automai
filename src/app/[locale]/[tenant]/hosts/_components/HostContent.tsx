import { getHosts } from '@/app/actions/hosts';
import ClientHostList from './client/ClientHostList';

export default async function HostContent() {
  // Fetch hosts directly in the server component
  const hostsResponse = await getHosts();
  const hosts = hostsResponse.success ? hostsResponse.data || [] : [];
  
  return <ClientHostList initialHosts={hosts} />;
}