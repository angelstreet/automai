'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { refreshDeployments } from '@/app/actions/jobsAction';
import { Deployment } from '@/types/component/deploymentComponentType';

export function useDeploymentActions(
  toast: any,
  setDeployments: React.Dispatch<React.SetStateAction<Deployment[]>>,
) {
  const router = useRouter();
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const handleViewDeployment = (deployment: Deployment, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    // Get the locale and tenant from the URL
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const locale = segments[0] || 'en';
    const tenant = segments[1] || 'trial';

    // Navigate to the job runs page for this configuration with proper path
    router.push(`/${locale}/${tenant}/deployment/job-runs/${deployment.id}`);
  };

  const handleDeleteClick = (deployment: Deployment, e: React.MouseEvent) => {
    e.stopPropagation();
    return {
      id: deployment.id,
      name: deployment.name,
    };
  };

  const handleConfirmDelete = async (selectedDeployment: Deployment | null): Promise<void> => {
    if (!selectedDeployment) {
      console.error(
        '[useDeploymentActions:handleConfirmDelete] No deployment selected for deletion',
      );
      return;
    }

    console.log('[useDeploymentActions:handleConfirmDelete] Confirming deletion of deployment:', {
      id: selectedDeployment.id,
      name: selectedDeployment.name,
    });

    try {
      // Save ID to a local variable to use in case of state updates
      const idToDelete = selectedDeployment.id;

      setActionInProgress(idToDelete);
      console.log(
        '[useDeploymentActions:handleConfirmDelete] Calling deleteJob with ID:',
        idToDelete,
      );

      // Make sure we're calling the server action with a direct string argument
      const { deleteJob } = await import('@/app/actions/jobsAction');
      const result = await deleteJob(String(idToDelete));
      console.log(
        '[useDeploymentActions:handleConfirmDelete] Delete result:',
        JSON.stringify(result),
      );

      if (result && result.success) {
        console.log(
          '[useDeploymentActions:handleConfirmDelete] Delete successful for ID:',
          idToDelete,
        );

        toast({
          title: 'Deployment Deleted',
          description: 'Successfully deleted.',
          variant: 'default',
        });

        // Update the local state to remove the deleted deployment
        setDeployments((current) => current.filter((d) => d.id !== idToDelete));

        // Use the server action to revalidate the deployment page
        await refreshDeployments();
      } else {
        console.error('[useDeploymentActions:handleConfirmDelete] Delete failed:', {
          id: selectedDeployment.id,
          error: result?.error || 'Unknown error',
        });
        toast({
          title: 'Error',
          description: result?.error || 'Failed to delete',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('[useDeploymentActions:handleConfirmDelete] Exception during delete:', {
        id: selectedDeployment?.id,
        error: error.message || 'Unknown error',
        stack: error.stack,
      });

      toast({
        title: 'Error',
        description: error.message || 'Unexpected error during deletion',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRunDeployment = async (deployment: Deployment): Promise<void> => {
    console.log('[useDeploymentActions:handleRunDeployment] Running deployment:', {
      id: deployment.id,
      name: deployment.name,
    });

    try {
      // Set running state for UI feedback
      setActionInProgress(deployment.id);

      // Import and call the server action
      const { startJob } = await import('@/app/actions/jobsAction');
      const result = await startJob(deployment.id.toString(), 'system');

      console.log('[useDeploymentActions:handleRunDeployment] Run job result:', result);

      if (result && result.success) {
        toast({
          title: 'Success',
          description: 'Job queued for execution',
          variant: 'default',
        });

        // Force refresh the deployments list
        await refreshDeployments();
      } else {
        console.error('[useDeploymentActions:handleRunDeployment] Run failed:', {
          id: deployment.id,
          error: result?.error || 'Unknown error',
        });
        toast({
          title: 'Error',
          description: result?.error || 'Failed to run job',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('[useDeploymentActions:handleRunDeployment] Exception during run:', {
        id: deployment.id,
        error: error.message || 'Unknown error',
        stack: error.stack,
      });
      toast({
        title: 'Error',
        description: error.message || 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleEditClick = (deployment: Deployment, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[useDeploymentActions:handleEditClick] Edit deployment:', {
      id: deployment.id,
      name: deployment.name,
    });

    // Get the locale and tenant from the URL
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const locale = segments[0] || 'en';
    const tenant = segments[1] || 'trial';

    router.push(`/${locale}/${tenant}/deployment/edit/${deployment.id}`);
  };

  const handleConfigClick = (deployment: Deployment, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[useDeploymentActions:handleConfigClick] Configure deployment:', {
      id: deployment.id,
      name: deployment.name,
    });

    // Get the locale and tenant from the URL
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const locale = segments[0] || 'en';
    const tenant = segments[1] || 'trial';

    router.push(`/${locale}/${tenant}/deployment/config/${deployment.id}`);
  };

  const handleOutputClick = (deployment: Deployment, e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[useDeploymentActions:handleOutputClick] View output for deployment:', {
      id: deployment.id,
      name: deployment.name,
    });

    // Get the locale and tenant from the URL
    const pathname = window.location.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const locale = segments[0] || 'en';
    const tenant = segments[1] || 'trial';

    router.push(`/${locale}/${tenant}/deployment/output/${deployment.id}`);
  };

  const handleDuplicateClick = async (
    deployment: Deployment,
    e: React.MouseEvent,
  ): Promise<void> => {
    e.stopPropagation();
    console.log('[useDeploymentActions:handleDuplicateClick] Duplicating deployment:', {
      id: deployment.id,
      name: deployment.name,
    });

    try {
      setActionInProgress(deployment.id);

      // Import and call the server action
      const { duplicateDeployment } = await import('@/app/actions/jobsAction');
      const result = await duplicateDeployment(deployment.id.toString());

      if (result && result.success) {
        toast({
          title: 'Success',
          description: 'Job duplicated successfully',
          variant: 'default',
        });

        // Force refresh the deployments list
        await refreshDeployments();
      } else {
        console.error('[useDeploymentActions:handleDuplicateClick] Duplication failed:', {
          id: deployment.id,
          error: result?.error || 'Unknown error',
        });
        toast({
          title: 'Error',
          description: result?.error || 'Failed to duplicate job',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('[useDeploymentActions:handleDuplicateClick] Exception during duplication:', {
        id: deployment.id,
        error: error.message || 'Unknown error',
        stack: error.stack,
      });
      toast({
        title: 'Error',
        description: error.message || 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleToggleActiveClick = async (
    deployment: Deployment,
    e: React.MouseEvent,
  ): Promise<void> => {
    e.stopPropagation();
    const newStatus = !deployment.is_active;

    console.log('[useDeploymentActions:handleToggleActiveClick] Toggling deployment status:', {
      id: deployment.id,
      name: deployment.name,
      currentStatus: deployment.is_active,
      newStatus: newStatus,
    });

    try {
      setActionInProgress(deployment.id);

      // Import and call the server action
      const { toggleJobActiveStatus } = await import('@/app/actions/jobsAction');
      const result = await toggleJobActiveStatus(deployment.id.toString(), newStatus);

      if (result && result.success) {
        toast({
          title: 'Success',
          description: `Job ${newStatus ? 'enabled' : 'disabled'} successfully`,
          variant: 'default',
        });

        // Update local state
        setDeployments((prev) =>
          prev.map((d) => (d.id === deployment.id ? { ...d, is_active: newStatus } : d)),
        );

        // Force refresh the deployments list
        await refreshDeployments();
      } else {
        console.error('[useDeploymentActions:handleToggleActiveClick] Toggle failed:', {
          id: deployment.id,
          error: result?.error || 'Unknown error',
        });
        toast({
          title: 'Error',
          description: result?.error || 'Failed to update job status',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('[useDeploymentActions:handleToggleActiveClick] Exception during toggle:', {
        id: deployment.id,
        error: error.message || 'Unknown error',
        stack: error.stack,
      });
      toast({
        title: 'Error',
        description: error.message || 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  return {
    actionInProgress,
    handleViewDeployment,
    handleDeleteClick,
    handleConfirmDelete,
    handleRunDeployment,
    handleEditClick,
    handleConfigClick,
    handleOutputClick,
    handleDuplicateClick,
    handleToggleActiveClick,
  };
}
