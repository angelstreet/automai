'use client';

import { useState, useEffect, useCallback } from 'react';
import { Deployment, DeploymentFormData } from './types';
import { 
  getDeployments, 
  getDeploymentById, 
  createDeployment, 
  abortDeployment, 
  refreshDeployment,
  getScriptsForRepository,
  getAvailableHosts
} from './actions';

export function useDeployments() {
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all deployments
  const fetchDeployments = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getDeployments();
      setDeployments(data);
    } catch (err) {
      setError('Failed to load deployments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch a single deployment by ID
  const fetchDeploymentById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const deployment = await getDeploymentById(id);
      return deployment;
    } catch (err) {
      setError('Failed to load deployment details');
      console.error(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new deployment
  const handleCreateDeployment = useCallback(async (formData: DeploymentFormData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await createDeployment(formData);
      
      if (!result.success) {
        setError(result.error || 'Failed to create deployment');
        return { success: false, error: result.error };
      }
      
      // Refresh the deployments list
      await fetchDeployments();
      
      return { success: true, deploymentId: result.deploymentId };
    } catch (err) {
      const errorMessage = 'Failed to create deployment';
      setError(errorMessage);
      console.error(err);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [fetchDeployments]);

  // Abort a running deployment
  const handleAbortDeployment = useCallback(async (id: string) => {
    setError(null);
    
    try {
      const result = await abortDeployment(id);
      
      if (!result.success) {
        setError(result.error || 'Failed to abort deployment');
        return { success: false, error: result.error };
      }
      
      // Refresh the deployments list
      await fetchDeployments();
      
      return { success: true };
    } catch (err) {
      const errorMessage = 'Failed to abort deployment';
      setError(errorMessage);
      console.error(err);
      return { success: false, error: errorMessage };
    }
  }, [fetchDeployments]);

  // Refresh a deployment's status
  const handleRefreshDeployment = useCallback(async (id: string) => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      const result = await refreshDeployment(id);
      
      if (!result.success) {
        setError(result.error || 'Failed to refresh deployment');
        return { success: false, error: result.error };
      }
      
      // If we got updated deployment data, update it in the list
      if (result.deployment) {
        setDeployments(prevDeployments => 
          prevDeployments.map(d => 
            d.id === id ? result.deployment! : d
          )
        );
      }
      
      return { success: true, deployment: result.deployment };
    } catch (err) {
      const errorMessage = 'Failed to refresh deployment';
      setError(errorMessage);
      console.error(err);
      return { success: false, error: errorMessage };
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Get scripts for a repository
  const fetchScriptsForRepository = useCallback(async (repositoryId: string) => {
    try {
      return await getScriptsForRepository(repositoryId);
    } catch (err) {
      console.error('Error fetching scripts:', err);
      return [];
    }
  }, []);

  // Get available hosts
  const fetchAvailableHosts = useCallback(async () => {
    try {
      return await getAvailableHosts();
    } catch (err) {
      console.error('Error fetching hosts:', err);
      return [];
    }
  }, []);

  // Fetch deployments on component mount
  useEffect(() => {
    fetchDeployments();
  }, [fetchDeployments]);

  return {
    deployments,
    loading,
    error,
    isRefreshing,
    fetchDeployments,
    fetchDeploymentById,
    createDeployment: handleCreateDeployment,
    abortDeployment: handleAbortDeployment,
    refreshDeployment: handleRefreshDeployment,
    fetchScriptsForRepository,
    fetchAvailableHosts
  };
}

export function useDeploymentDetails(deploymentId: string) {
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch deployment details
  const fetchDeployment = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getDeploymentById(deploymentId);
      setDeployment(data);
    } catch (err) {
      setError('Failed to load deployment details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [deploymentId]);

  // Refresh deployment status
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setError(null);
    
    try {
      const result = await refreshDeployment(deploymentId);
      
      if (!result.success) {
        setError(result.error || 'Failed to refresh deployment status');
        return { success: false };
      }
      
      if (result.deployment) {
        setDeployment(result.deployment);
      }
      
      return { success: true };
    } catch (err) {
      const errorMessage = 'Failed to refresh deployment status';
      setError(errorMessage);
      console.error(err);
      return { success: false, error: errorMessage };
    } finally {
      setIsRefreshing(false);
    }
  }, [deploymentId]);

  // Abort deployment
  const handleAbort = useCallback(async () => {
    setError(null);
    
    try {
      const result = await abortDeployment(deploymentId);
      
      if (!result.success) {
        setError(result.error || 'Failed to abort deployment');
        return { success: false };
      }
      
      // Refresh deployment details
      await fetchDeployment();
      
      return { success: true };
    } catch (err) {
      const errorMessage = 'Failed to abort deployment';
      setError(errorMessage);
      console.error(err);
      return { success: false, error: errorMessage };
    }
  }, [deploymentId, fetchDeployment]);

  // Fetch deployment on component mount
  useEffect(() => {
    fetchDeployment();
  }, [fetchDeployment]);

  return {
    deployment,
    loading,
    error,
    isRefreshing,
    refreshDeployment: handleRefresh,
    abortDeployment: handleAbort
  };
}