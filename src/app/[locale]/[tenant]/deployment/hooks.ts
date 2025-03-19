'use client';

import { useState, useCallback, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { 
  getAvailableCICDProviders, 
  getAvailableCICDJobs, 
  getCICDJobDetails,
  getDeploymentStatus,
  createDeployment
} from './actions';
import { CICDProvider, CICDJob, DeploymentFormData } from './types';

// Constants for cache keys
const CACHE_KEYS = {
  PROVIDERS: 'cicd-providers',
  JOBS: (providerId: string) => `cicd-jobs-${providerId}`,
  JOB_DETAILS: (providerId: string, jobId: string) => `cicd-job-details-${providerId}-${jobId}`,
  DEPLOYMENT_STATUS: (deploymentId: string) => `deployment-status-${deploymentId}`
};

// Cache expiration time (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Hook to fetch CI/CD providers
 */
export function useCICDProviders() {
  const { mutate } = useSWRConfig();
  
  // Fetch providers with SWR + localStorage caching
  const fetcher = async () => {
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(CACHE_KEYS.PROVIDERS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() < parsed.expiry) {
          return parsed.data;
        }
      }
    }
    
    // Fetch from API
    const result = await getAvailableCICDProviders();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch CI/CD providers');
    }
    
    // Cache in localStorage
    if (typeof window !== 'undefined' && result.providers) {
      localStorage.setItem(CACHE_KEYS.PROVIDERS, JSON.stringify({
        data: result.providers,
        expiry: Date.now() + CACHE_TTL
      }));
    }
    
    return result.providers;
  };
  
  const { data, error, isLoading, isValidating } = useSWR<CICDProvider[]>(
    CACHE_KEYS.PROVIDERS,
    fetcher,
    {
      dedupingInterval: 60000, // 1 minute
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  );
  
  // Function to manually refresh providers
  const refreshProviders = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CACHE_KEYS.PROVIDERS);
    }
    mutate(CACHE_KEYS.PROVIDERS);
  }, [mutate]);
  
  return {
    providers: data || [],
    isLoading,
    isRefreshing: isValidating,
    error: error?.message,
    refreshProviders
  };
}

/**
 * Hook to fetch CI/CD jobs for a specific provider
 */
export function useCICDJobs(providerId?: string) {
  const { mutate } = useSWRConfig();
  
  // No provider ID, no jobs
  const cacheKey = providerId ? CACHE_KEYS.JOBS(providerId) : null;
  
  // Fetch jobs with SWR + localStorage caching
  const fetcher = async () => {
    if (!providerId) {
      return [];
    }
    
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cacheKey!);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() < parsed.expiry) {
          return parsed.data;
        }
      }
    }
    
    // Fetch from API
    const result = await getAvailableCICDJobs(providerId);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch CI/CD jobs');
    }
    
    // Cache in localStorage
    if (typeof window !== 'undefined' && result.jobs) {
      localStorage.setItem(cacheKey!, JSON.stringify({
        data: result.jobs,
        expiry: Date.now() + CACHE_TTL
      }));
    }
    
    return result.jobs;
  };
  
  const { data, error, isLoading, isValidating } = useSWR<CICDJob[]>(
    cacheKey,
    fetcher,
    {
      dedupingInterval: 60000, // 1 minute
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  );
  
  // Function to manually refresh jobs
  const refreshJobs = useCallback(() => {
    if (typeof window !== 'undefined' && cacheKey) {
      localStorage.removeItem(cacheKey);
    }
    if (cacheKey) {
      mutate(cacheKey);
    }
  }, [mutate, cacheKey]);
  
  return {
    jobs: data || [],
    isLoading,
    isRefreshing: isValidating,
    error: error?.message,
    refreshJobs
  };
}

/**
 * Hook to fetch detailed information about a specific CI/CD job
 */
export function useCICDJobDetails(providerId?: string, jobId?: string) {
  const { mutate } = useSWRConfig();
  
  // No provider ID or job ID, no details
  const cacheKey = providerId && jobId ? CACHE_KEYS.JOB_DETAILS(providerId, jobId) : null;
  
  // Fetch job details with SWR + localStorage caching
  const fetcher = async () => {
    if (!providerId || !jobId) {
      return null;
    }
    
    // Check localStorage first
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cacheKey!);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() < parsed.expiry) {
          return parsed.data;
        }
      }
    }
    
    // Fetch from API
    const result = await getCICDJobDetails(providerId, jobId);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch job details');
    }
    
    // Cache in localStorage
    if (typeof window !== 'undefined' && result.job) {
      localStorage.setItem(cacheKey!, JSON.stringify({
        data: result.job,
        expiry: Date.now() + CACHE_TTL
      }));
    }
    
    return result.job;
  };
  
  const { data, error, isLoading, isValidating } = useSWR(
    cacheKey,
    fetcher,
    {
      dedupingInterval: 60000, // 1 minute
      revalidateOnFocus: false,
      revalidateOnReconnect: true
    }
  );
  
  // Function to manually refresh job details
  const refreshJobDetails = useCallback(() => {
    if (typeof window !== 'undefined' && cacheKey) {
      localStorage.removeItem(cacheKey);
    }
    if (cacheKey) {
      mutate(cacheKey);
    }
  }, [mutate, cacheKey]);
  
  return {
    job: data,
    parameters: data?.parameters || [],
    isLoading,
    isRefreshing: isValidating,
    error: error?.message,
    refreshJobDetails
  };
}

/**
 * Hook to create a deployment with CI/CD integration
 */
export function useCreateDeployment() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deploymentId, setDeploymentId] = useState<string | null>(null);
  
  const submit = useCallback(async (formData: DeploymentFormData) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await createDeployment(formData);
      
      if (!result.success) {
        setError(result.error || 'Failed to create deployment');
        return null;
      }
      
      setDeploymentId(result.deploymentId || null);
      return result.deploymentId;
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  }, []);
  
  const reset = useCallback(() => {
    setError(null);
    setDeploymentId(null);
  }, []);
  
  return {
    submit,
    reset,
    isSubmitting,
    error,
    deploymentId
  };
}

/**
 * Hook to monitor deployment status including CI/CD status
 */
export function useDeploymentStatus(deploymentId?: string) {
  const { mutate } = useSWRConfig();
  
  // No deployment ID, no status
  const cacheKey = deploymentId ? CACHE_KEYS.DEPLOYMENT_STATUS(deploymentId) : null;
  
  // Fetch deployment status
  const fetcher = async () => {
    if (!deploymentId) {
      return null;
    }
    
    const result = await getDeploymentStatus(deploymentId);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch deployment status');
    }
    
    return {
      deployment: result.deployment,
      cicd: result.cicd
    };
  };
  
  // Poll more frequently for running deployments
  const [pollInterval, setPollInterval] = useState(10000); // 10 seconds by default
  
  const { data, error, isLoading, isValidating, mutate: refreshData } = useSWR(
    cacheKey,
    fetcher,
    {
      refreshInterval: pollInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true
    }
  );
  
  // Set appropriate poll interval based on deployment status
  useEffect(() => {
    if (data?.deployment?.status === 'in_progress' || data?.cicd?.status === 'running') {
      setPollInterval(5000); // Poll every 5 seconds for running deployments
    } else if (data?.deployment?.status === 'pending' || data?.deployment?.status === 'scheduled') {
      setPollInterval(10000); // Poll every 10 seconds for pending deployments
    } else {
      setPollInterval(30000); // Poll every 30 seconds for completed deployments
    }
  }, [data]);
  
  // Function to manually refresh status
  const refreshStatus = useCallback(() => {
    if (cacheKey) {
      refreshData();
    }
  }, [refreshData, cacheKey]);
  
  return {
    deployment: data?.deployment,
    cicd: data?.cicd,
    isLoading,
    isRefreshing: isValidating,
    error: error?.message,
    refreshStatus
  };
}