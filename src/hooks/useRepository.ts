'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { 
  getRepository,
  updateRepository, 
  deleteRepository, 
  syncRepository 
} from '@/app/actions/repositories';
import { Repository } from '@/types/repositories';

export function useRepository(initialRepositoryId?: string) {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [loading, setLoading] = useState(initialRepositoryId ? true : false);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const fetchRepository = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await getRepository(id);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to fetch repository'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to fetch repository',
          variant: 'destructive',
        });
        return null;
      }
      
      setRepository(result.data || null);
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch repository';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const updateRepositoryDetails = useCallback(async (
    updates: Partial<Repository>
  ) => {
    if (!repository?.id) {
      toast({
        title: 'Error',
        description: 'No repository selected',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await updateRepository(repository.id, updates);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to update repository'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to update repository',
          variant: 'destructive',
        });
        return null;
      }
      
      setRepository(result.data || null);
      
      toast({
        title: 'Success',
        description: 'Repository updated successfully',
      });
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update repository';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [repository, toast]);

  const removeRepository = useCallback(async () => {
    if (!repository?.id) {
      toast({
        title: 'Error',
        description: 'No repository selected',
        variant: 'destructive',
      });
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await deleteRepository(repository.id);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to delete repository'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to delete repository',
          variant: 'destructive',
        });
        return false;
      }
      
      setRepository(null);
      
      toast({
        title: 'Success',
        description: 'Repository deleted successfully',
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete repository';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  }, [repository, toast]);

  const syncRepositoryData = useCallback(async () => {
    if (!repository?.id) {
      toast({
        title: 'Error',
        description: 'No repository selected',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await syncRepository(repository.id);
      
      if (!result.success) {
        setError(new Error(result.error || 'Failed to sync repository'));
        toast({
          title: 'Error',
          description: result.error || 'Failed to sync repository',
          variant: 'destructive',
        });
        return null;
      }
      
      setRepository(result.data || null);
      
      toast({
        title: 'Success',
        description: 'Repository synced successfully',
      });
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sync repository';
      setError(err instanceof Error ? err : new Error(errorMessage));
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  }, [repository, toast]);

  // Fetch repository on mount if initialRepositoryId is provided
  useEffect(() => {
    if (initialRepositoryId) {
      fetchRepository(initialRepositoryId);
    }
  }, [initialRepositoryId, fetchRepository]);

  return {
    repository,
    loading,
    error,
    fetchRepository,
    updateRepository: updateRepositoryDetails,
    deleteRepository: removeRepository,
    syncRepository: syncRepositoryData,
    isLoaded: !loading && repository !== null
  };
} 