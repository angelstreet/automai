'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import {
  useCICDProviders,
  useCICDJobs,
  createCICDProvider,
  updateCICDProvider,
  deleteCICDProvider,
  testCICDProvider,
  getCICDProviderById,
  getCICDJobById,
  refreshCICDData,
} from '@/hooks/useCICDData';
import type {
  CICDProviderType,
  CICDProviderPayload,
  ActionResult,
  CICDJob,
  CICDContextType,
} from '@/app/[locale]/[tenant]/cicd/types';
import { INITIAL_STATE } from '@/app/[locale]/[tenant]/cicd/constants';

// Create context
const CICDContext = createContext<CICDContextType | undefined>(undefined);

// Provider component
export function CICDProvider({ children }: { children: ReactNode }) {
  // Use SWR hooks
  const {
    data: providersData,
    error: providersError,
    mutate: mutateProviders,
    isValidating: isRefreshingProviders,
  } = useCICDProviders();
  const { data: jobsData, error: jobsError, mutate: mutateJobs } = useCICDJobs();

  // Local state for selected items and user
  const [selectedProvider, setSelectedProvider] = useState<CICDProviderType | null>(null);
  const [selectedJob, setSelectedJob] = useState<CICDJob | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Derived values from SWR data
  const providers = useMemo(() => providersData?.data || [], [providersData]);

  const jobs = useMemo(() => jobsData?.data || [], [jobsData]);

  const loading = useMemo(
    () =>
      (providersData === undefined && !providersError) || (jobsData === undefined && !jobsError),
    [providersData, providersError, jobsData, jobsError],
  );

  const error = useMemo(
    () => (providersError ? String(providersError) : jobsError ? String(jobsError) : null),
    [providersError, jobsError],
  );

  // Methods
  const fetchProviders = useCallback(async () => {
    try {
      await mutateProviders();
      return { success: true, data: providers };
    } catch (err) {
      console.error('Error fetching CICD providers:', err);
      return { success: false, error: String(err), data: [] };
    }
  }, [mutateProviders, providers]);

  const getProviderById = useCallback(
    (id: string) => {
      // First check if it's the selected provider
      if (selectedProvider && selectedProvider.id === id) {
        return selectedProvider;
      }

      // Then check in the providers array
      return getCICDProviderById(providers, id);
    },
    [selectedProvider, providers],
  );

  const createProvider = useCallback(async (payload: CICDProviderPayload) => {
    return await createCICDProvider(payload);
  }, []);

  const updateProvider = useCallback(async (id: string, payload: CICDProviderPayload) => {
    return await updateCICDProvider(id, payload);
  }, []);

  const deleteProvider = useCallback(async (id: string) => {
    return await deleteCICDProvider(id);
  }, []);

  const testProvider = useCallback(async (provider: CICDProviderPayload) => {
    return await testCICDProvider(provider);
  }, []);

  const fetchJobs = useCallback(async (providerId?: string) => {
    try {
      const { data: jobsResponse } = await useCICDJobs(providerId);
      return jobsResponse?.data || [];
    } catch (error) {
      console.error('Error fetching CICD jobs:', error);
      return [];
    }
  }, []);

  const getJobById = useCallback(
    (id: string) => {
      // First check if it's the selected job
      if (selectedJob && selectedJob.id === id) {
        return selectedJob;
      }

      // Then check in the jobs array
      return getCICDJobById(jobs, id);
    },
    [selectedJob, jobs],
  );

  const refreshUserData = useCallback(async () => {
    // This would be replaced with actual user data fetching
    return currentUser;
  }, [currentUser]);

  // Implement missing methods with stubs
  const triggerJob = useCallback(async (jobId: string) => {
    // This would need to be implemented with a real API call
    console.warn('triggerJob is not implemented');
    return { success: false, error: 'Not implemented' };
  }, []);

  const getBuildStatus = useCallback(async (buildId: string) => {
    // This would need to be implemented with a real API call
    console.warn('getBuildStatus is not implemented');
    return null;
  }, []);

  const getBuildLogs = useCallback(async (buildId: string) => {
    // This would need to be implemented with a real API call
    console.warn('getBuildLogs is not implemented');
    return '';
  }, []);

  // Create context value with memoization
  const contextValue = useMemo(
    (): CICDContextType => ({
      // State
      providers,
      jobs,
      builds: [],
      selectedProvider,
      selectedJob,
      loading,
      error,
      currentUser,

      // Actions
      fetchProviders,
      getProviderById,
      createProvider,
      updateProvider,
      deleteProvider,
      testProvider,
      fetchJobs,
      getJobById,
      triggerJob,
      getBuildStatus,
      getBuildLogs,
      fetchUserData: refreshUserData,
      setSelectedProvider,
      setSelectedJob,
      refreshUserData,
    }),
    [
      providers,
      jobs,
      selectedProvider,
      selectedJob,
      loading,
      error,
      currentUser,
      fetchProviders,
      getProviderById,
      createProvider,
      updateProvider,
      deleteProvider,
      testProvider,
      fetchJobs,
      getJobById,
      triggerJob,
      getBuildStatus,
      getBuildLogs,
      refreshUserData,
    ],
  );

  return <CICDContext.Provider value={contextValue}>{children}</CICDContext.Provider>;
}

// Hook to use the context
export function useCICD() {
  const context = useContext(CICDContext);

  if (context === undefined) {
    throw new Error('useCICD must be used within a CICDProvider');
  }

  return context;
}
