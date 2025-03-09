import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getTenants, switchTenant as switchTenantAction } from '@/app/actions/tenants';

interface Tenant {
  id: string;
  name: string;
  iconName?: string;
}

export function useTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchTenants = useCallback(async () => {
    if (!user) {
      setTenants([]);
      setCurrentTenant(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await getTenants(user.id);
      
      if (response.success && response.data && response.data.length > 0) {
        // Map database tenants to UI tenants
        const mappedTenants = response.data.map((tenant: { id: string; name: string }) => ({
          id: tenant.id,
          name: tenant.name,
          iconName: 'building',
        }));

        setTenants(mappedTenants);

        // Set current tenant from user metadata or first available tenant
        const currentTenantId = user.user_metadata?.tenant_id || mappedTenants[0]?.id;
        const current = mappedTenants.find((t: Tenant) => t.id === currentTenantId) || mappedTenants[0];
        setCurrentTenant(current);
      } else {
        // No tenants found or error occurred, create a default tenant
        const defaultTenant = {
          id: 'default',
          name: 'Default',
          iconName: 'building',
        };
        setTenants([defaultTenant]);
        setCurrentTenant(defaultTenant);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch tenants',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  const switchTenant = useCallback(async (tenantId: string) => {
    try {
      await switchTenantAction(tenantId);
      const newTenant = tenants.find(t => t.id === tenantId);
      if (newTenant) {
        setCurrentTenant(newTenant);
        toast({
          title: 'Success',
          description: `Switched to ${newTenant.name}`,
        });
      }
    } catch (error) {
      console.error('Error switching tenant:', error);
      toast({
        title: 'Error',
        description: 'Failed to switch tenant',
        variant: 'destructive',
      });
    }
  }, [tenants, toast]);

  // Fetch tenants on mount or when user changes
  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  return {
    tenants,
    currentTenant,
    isLoading,
    switchTenant,
  };
} 