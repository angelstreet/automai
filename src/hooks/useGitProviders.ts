import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { GitProvider } from '@/types/repositories';
import { 
  getGitProviders, 
  addGitProvider, 
  updateGitProvider, 
  refreshGitProvider 
} from '@/app/actions/git-providers';

export function useGitProviders() {
  const [providers, setProviders] = useState<GitProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState<string | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  const [editingProvider, setEditingProvider] = useState<GitProvider | null>(null);
  const { toast } = useToast();

  const fetchProviders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getGitProviders();
      if (response.success && response.data) {
        setProviders(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch git providers');
      }
    } catch (error) {
      console.error('Error fetching git providers:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch git providers',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const addProvider = useCallback(async (data: Omit<GitProvider, 'id'>) => {
    try {
      setIsAddingProvider(true);
      const newProvider = await addGitProvider(data);
      setProviders(prev => [...prev, newProvider]);
      toast({
        title: 'Success',
        description: 'Git provider added successfully',
      });
      return true;
    } catch (error) {
      console.error('Error adding git provider:', error);
      toast({
        title: 'Error',
        description: 'Failed to add git provider',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsAddingProvider(false);
    }
  }, [toast]);

  const editProvider = useCallback(async (id: string, data: Partial<GitProvider>) => {
    try {
      const updatedProvider = await updateGitProvider(id, data);
      setProviders(prev => 
        prev.map(provider => provider.id === id ? updatedProvider : provider)
      );
      setEditingProvider(null);
      toast({
        title: 'Success',
        description: 'Git provider updated successfully',
      });
      return true;
    } catch (error) {
      console.error('Error updating git provider:', error);
      toast({
        title: 'Error',
        description: 'Failed to update git provider',
        variant: 'destructive',
      });
      return false;
    }
  }, [toast]);

  const refreshProvider = useCallback(async (id: string) => {
    try {
      setIsRefreshing(id);
      const updatedProvider = await refreshGitProvider(id);
      setProviders(prev => 
        prev.map(provider => provider.id === id ? updatedProvider : provider)
      );
      toast({
        title: 'Success',
        description: 'Git provider refreshed successfully',
      });
    } catch (error) {
      console.error('Error refreshing git provider:', error);
      toast({
        title: 'Error',
        description: 'Failed to refresh git provider',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(null);
    }
  }, [toast]);

  // Fetch providers on mount
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  return {
    providers,
    isLoading,
    isRefreshing,
    refreshProvider,
    addProvider,
    isAddingProvider,
    editProvider,
    editingProvider,
    setEditingProvider,
  };
} 