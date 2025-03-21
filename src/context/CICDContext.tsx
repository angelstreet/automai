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
  CICDProvider as CICDProviderType,
  CICDProviderPayload,
  CICDJob,
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
      // Use cached user data when available
      const user = state.currentUser || await fetchUserData();
      
      console.log('[CICDContext] fetchProviders called', {
        hasUser: !!user,
        renderCount: renderCount.current++,
        componentState: 'loading'
      });
      
      // Pass user data to the server action to avoid redundant auth
      const result = await getCICDProviders(user, 'CICDContext', renderCount.current);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          providers: result.data || [],
          loading: false
        }));
        
        console.log('[CICDContext] fetchProviders complete', {
          providerCount: result.data?.length || 0,
          componentState: 'loaded'
        });
        
        return result;
      } else {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to fetch CI/CD providers',
          loading: false
        }));
        
        console.error('[CICDContext] Error fetching providers:', result.error);
        return result;
      }
    } catch (err: any) {
      console.error('[CICDContext] Unexpected error in fetchProviders:', err);
      
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
  }, [state.currentUser, fetchUserData]);

  // Get provider by ID
  const getProviderById = useCallback(async (id: string): Promise<CICDProviderType | null> => {
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
          providers: [...prev.providers, result.data!],
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
            p.id === id ? result.data! : p
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
  
  // Select a provider
  const selectProvider = useCallback((provider: CICDProviderType | null) => {
    setState(prev => ({
      ...prev,
      selectedProvider: provider
    }));
  }, []);
  
  // Select a job
  const selectJob = useCallback((job: CICDJob | null) => {
    setState(prev => ({
      ...prev,
      selectedJob: job
    }));
  }, []);
  
  // Initialize CI/CD data
  useEffect(() => {
    const initialize = async () => {
      await fetchUserData();
      fetchProviders();
    };
    
    initialize();
  }, [fetchUserData, fetchProviders]);
  
  // Create context value
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
    selectedProvider: state.selectedProvider,
    selectedJob: state.selectedJob,
    fetchUserData,
    
    // Stub implementations for missing required methods
    fetchJobs: async () => [],
    getJobById: async () => null,
    triggerJob: async () => ({ success: false, error: "Not implemented" }),
    getBuildStatus: async () => null,
    getBuildLogs: async () => "",
    
    // UI state management
    setSelectedProvider: (provider) => setState(prev => ({ ...prev, selectedProvider: provider })),
    setSelectedJob: (job) => setState(prev => ({ ...prev, selectedJob: job }))
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