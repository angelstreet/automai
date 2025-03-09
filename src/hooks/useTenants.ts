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
      console.log('Fetching tenants for user:', user.id);
      console.log('User metadata:', user.user_metadata);
      const response = await getTenants(user.id);
      
      if (response.success && response.data && response.data.length > 0) {
        // Map database tenants to UI tenants
        const mappedTenants = response.data.map((tenant: { id: string; name: string }) => ({
          id: tenant.id,
          name: tenant.name,
          iconName: 'building',
        }));

        console.log('Mapped tenants:', mappedTenants);
        setTenants(mappedTenants);

        // Get tenant_name from user metadata
        const currentTenantName = user.user_metadata?.tenant_name || 'trial';
        console.log('Current tenant name from metadata:', currentTenantName);
        
        // Find tenant by name
        const current = mappedTenants.find((t: Tenant) => t.name === currentTenantName) || mappedTenants[0];
        console.log('Setting current tenant:', current);
        setCurrentTenant(current);
      } else {
        console.log('No tenants found, using default');
        // No tenants found or error occurred, create a default tenant
        const defaultTenant = {
          id: 'trial',
          name: 'trial',
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

  const switchTenant = useCallback(async (tenantName: string) => {
    try {
      await switchTenantAction(tenantName);
      const newTenant = tenants.find(t => t.name === tenantName);
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