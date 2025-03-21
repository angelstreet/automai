'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { 
  getCICDProvidersAction,
  createCICDProviderAction,
  updateCICDProviderAction,
  deleteCICDProviderAction,
  testCICDProviderAction
} from '@/app/[locale]/[tenant]/cicd/actions';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';
import {
  CICDProvider,
  CICDProviderPayload,
  CICDJob,
  CICDBuild,
  ActionResult
} from '@/types/cicd';
import { CICDContextType, CICDData, CICDActions } from '@/types/context/cicd';

// Initial state
const initialState: CICDData = {
  providers: [],
  jobs: [],
  builds: [],
  selectedProvider: null,
  selectedJob: null,
  loading: false,
  error: null,
  currentUser: null
};

// Create context
const CICDContext = createContext<CICDContextType | undefined>(undefined);

// Provider component
export const CICDProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<CICDData>(initialState);
  
  // Fetch user data
  const fetchUserData = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const user = await getUser();
      setState(prev => ({ ...prev, currentUser: user }));
      return user;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }
  }, []);

  // Fetch CI/CD providers
  const fetchProviders = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await getCICDProvidersAction();
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          providers: result.data || [],
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to fetch CI/CD providers',
          loading: false
        }));
      }
      
      return result;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'An unexpected error occurred',
        loading: false
      }));
      
      return {
        success: false,
        data: [],
        error: err.message || 'An unexpected error occurred'
      };
    }
  }, []);

  // Get provider by ID
  const getProviderById = useCallback(async (id: string): Promise<CICDProvider | null> => {
    try {
      // First check if we already have the provider in state
      const cachedProvider = state.providers.find(p => p.id === id);
      if (cachedProvider) {
        return cachedProvider;
      }
      
      // If not found in state, fetch all providers then find the one we need
      const result = await fetchProviders();
      
      if (result.success && result.data) {
        const provider = result.data.find(p => p.id === id);
        return provider || null;
      }
      
      return null;
    } catch (err) {
      console.error(`Error getting CI/CD provider ${id}:`, err);
      return null;
    }
  }, [state.providers, fetchProviders]);

  // Create a new CI/CD provider
  const createProvider = useCallback(async (payload: CICDProviderPayload) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await createCICDProviderAction(payload);
      
      if (result.success && result.data) {
        // Update the local state with the new provider
        setState(prev => ({
          ...prev,
          providers: [...prev.providers, result.data],
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to create CI/CD provider',
          loading: false
        }));
      }
      
      return result;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'An unexpected error occurred',
        loading: false
      }));
      
      return {
        success: false,
        error: err.message || 'An unexpected error occurred'
      };
    }
  }, []);

  // Update an existing CI/CD provider
  const updateProvider = useCallback(async (id: string, payload: CICDProviderPayload) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await updateCICDProviderAction(id, payload);
      
      if (result.success && result.data) {
        // Update the provider in local state
        setState(prev => ({
          ...prev,
          providers: prev.providers.map(p => 
            p.id === id ? result.data : p
          ),
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to update CI/CD provider',
          loading: false
        }));
      }
      
      return result;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'An unexpected error occurred',
        loading: false
      }));
      
      return {
        success: false,
        error: err.message || 'An unexpected error occurred'
      };
    }
  }, []);

  // Delete a CI/CD provider
  const deleteProvider = useCallback(async (id: string): Promise<ActionResult> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await deleteCICDProviderAction(id);
      
      if (result.success) {
        // Remove the provider from local state
        setState(prev => ({
          ...prev,
          providers: prev.providers.filter(p => p.id !== id),
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to delete CI/CD provider',
          loading: false
        }));
      }
      
      return result;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'An unexpected error occurred',
        loading: false
      }));
      
      return {
        success: false,
        error: err.message || 'An unexpected error occurred'
      };
    }
  }, []);

  // Test a CI/CD provider connection
  const testProvider = useCallback(async (provider: CICDProviderPayload): Promise<ActionResult> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await testCICDProviderAction(provider);
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: result.success ? null : (result.error || 'Provider test failed')
      }));
      
      return result;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'An unexpected error occurred',
        loading: false
      }));
      
      return {
        success: false,
        error: err.message || 'An unexpected error occurred'
      };
    }
  }, []);

  // Fetch jobs for a CI/CD provider
  const fetchJobs = useCallback(async (providerId: string): Promise<CICDJob[]> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // This would be implemented with actual API calls to the appropriate service
      // For now, return the jobs from state or empty array
      const jobs = state.jobs.filter(job => job.provider_id === providerId);
      
      setState(prev => ({ ...prev, loading: false }));
      return jobs;
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to fetch jobs',
        loading: false
      }));
      
      return [];
    }
  }, [state.jobs]);

  // Get a specific job by ID
  const getJobById = useCallback(async (jobId: string): Promise<CICDJob | null> => {
    try {
      // Find job in state
      const job = state.jobs.find(job => job.id === jobId);
      return job || null;
    } catch (err) {
      console.error(`Error getting job ${jobId}:`, err);
      return null;
    }
  }, [state.jobs]);

  // Trigger a CI/CD job
  const triggerJob = useCallback(async (jobId: string, parameters?: Record<string, any>): Promise<ActionResult> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // This would trigger the job via the appropriate service
      // For demo purposes, we'll just return success
      
      setState(prev => ({ ...prev, loading: false }));
      return { success: true };
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        error: err.message || 'Failed to trigger job',
        loading: false
      }));
      
      return {
        success: false,
        error: err.message || 'Failed to trigger job'
      };
    }
  }, []);

  // Get build status for a job
  const getBuildStatus = useCallback(async (jobId: string, buildId: string): Promise<CICDBuild | null> => {
    try {
      // This would fetch the build status from the appropriate service
      // For demo purposes, return null
      return null;
    } catch (err) {
      console.error(`Error getting build status for job ${jobId}, build ${buildId}:`, err);
      return null;
    }
  }, []);

  // Get build logs for a job
  const getBuildLogs = useCallback(async (jobId: string, buildId: string): Promise<string> => {
    try {
      // This would fetch the build logs from the appropriate service
      // For demo purposes, return an empty string
      return '';
    } catch (err) {
      console.error(`Error getting build logs for job ${jobId}, build ${buildId}:`, err);
      return '';
    }
  }, []);

  // Set selected provider
  const setSelectedProvider = useCallback((provider: CICDProvider | null) => {
    setState(prev => ({
      ...prev,
      selectedProvider: provider
    }));
  }, []);

  // Set selected job
  const setSelectedJob = useCallback((job: CICDJob | null) => {
    setState(prev => ({
      ...prev,
      selectedJob: job
    }));
  }, []);

  // Initialize by fetching user data and providers
  useEffect(() => {
    const initialize = async () => {
      await fetchUserData();
      await fetchProviders();
    };
    
    initialize();
  }, [fetchUserData, fetchProviders]);

  // Combine all methods and state into context value
  const contextValue: CICDContextType = {
    // State
    ...state,
    
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
    fetchUserData,
    setSelectedProvider,
    setSelectedJob
  };
  
  return (
    <CICDContext.Provider value={contextValue}>
      {children}
    </CICDContext.Provider>
  );
};

// Hook to use the context
export function useCICDContext() {
  const context = useContext(CICDContext);
  if (context === undefined) {
    throw new Error('useCICDContext must be used within a CICDProvider');
  }
  return context;
} 