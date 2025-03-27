import { useCallback } from 'react';
import { useTeam } from '@/context';
import { useToast } from '@/components/shadcn/use-toast';

/**
 * Hook for checking resource limits with toast notifications
 * @returns Object with checkAndNotify function
 */
export function useResourceLimit() {
  const { checkResourceLimit } = useTeam();
  const { toast } = useToast();
  
  /**
   * Check if a resource can be created and show a toast notification if limit is reached
   * @param resourceType Type of resource to check (hosts, repositories, deployments, cicd_providers)
   * @returns Boolean indicating if resource can be created
   */
  const checkAndNotify = useCallback(async (resourceType: string): Promise<boolean> => {
    const result = await checkResourceLimit(resourceType);
    
    if (!result) {
      toast({
        title: 'Error',
        description: 'Unable to check resource limits',
        variant: 'destructive'
      });
      return false;
    }
    
    if (!result.canCreate) {
      toast({
        title: 'Resource Limit Reached',
        description: `You have reached your ${resourceType} limit (${result.current}/${result.limit}). Please upgrade your subscription or remove unused resources.`,
        variant: 'destructive'
      });
      return false;
    }
    
    return true;
  }, [checkResourceLimit, toast]);
  
  return { checkAndNotify };
}