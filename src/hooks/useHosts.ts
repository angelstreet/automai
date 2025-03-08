'use client';

import { useCallback, useEffect, useState } from 'react';
import { 
  getHosts, 
  createHost, 
  updateHost, 
  deleteHost,
  Host,
  HostFilter
} from '@/app/actions/hosts';

export function useHosts(initialFilter?: HostFilter) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filter, setFilter] = useState<HostFilter | undefined>(initialFilter);

  const fetchHosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHosts(filter);
      setHosts(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch hosts'));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  const create = async (data: Partial<Host>) => {
    try {
      const newHost = await createHost(data);
      setHosts(prev => [newHost, ...prev]);
      return newHost;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create host');
    }
  };

  const update = async (id: string, data: Partial<Host>) => {
    try {
      const updatedHost = await updateHost(id, data);
      setHosts(prev => 
        prev.map(host => host.id === id ? updatedHost : host)
      );
      return updatedHost;
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update host');
    }
  };

  const remove = async (id: string) => {
    try {
      await deleteHost(id);
      setHosts(prev => prev.filter(host => host.id !== id));
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete host');
    }
  };

  const updateFilter = (newFilter: HostFilter) => {
    setFilter(newFilter);
  };

  return {
    hosts,
    loading,
    error,
    filter,
    updateFilter,
    create,
    update,
    remove,
    refresh: fetchHosts
  };
}
