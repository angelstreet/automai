import { useRef, useCallback } from 'react';
import { hasDataChanged } from '@/utils/contextHelpers';

/**
 * Hook to protect against infinite fetch loops and duplicate requests
 * 
 * @param prefix - Debug prefix for logging
 * @returns Object with utility functions
 */
export function useRequestProtection(prefix = 'RequestProtection') {
  // Store in-flight requests
  const inFlightRequests = useRef<Record<string, boolean>>({});
  
  // Store render count for debugging
  const renderCount = useRef(0);
  
  // Increment render count
  renderCount.current++;
  
  /**
   * Check if a request is already in progress
   * 
   * @param requestKey - Identifier for the request
   * @returns true if the request can proceed (not in progress)
   */
  const canMakeRequest = useCallback((requestKey: string): boolean => {
    if (inFlightRequests.current[requestKey]) {
      console.log(`[${prefix}] Skip duplicate request: ${requestKey} (render #${renderCount.current})`);
      return false;
    }
    return true;
  }, [prefix]);
  
  /**
   * Wrap a fetch request with protection against duplicates
   * 
   * @param requestKey - Identifier for the request 
   * @param fetchFn - The fetch function to execute
   * @returns Promise with the fetch results
   */
  const protectedFetch = useCallback(async <T>(
    requestKey: string,
    fetchFn: () => Promise<T>
  ): Promise<T | null> => {
    // Skip if already in progress
    if (!canMakeRequest(requestKey)) {
      return null;
    }
    
    // Mark as in progress
    inFlightRequests.current[requestKey] = true;
    console.log(`[${prefix}] Starting request: ${requestKey} (render #${renderCount.current})`);
    
    try {
      const result = await fetchFn();
      return result;
    } catch (error) {
      console.error(`[${prefix}] Error in request ${requestKey}:`, error);
      throw error;
    } finally {
      // Mark as complete
      inFlightRequests.current[requestKey] = false;
      console.log(`[${prefix}] Completed request: ${requestKey}`);
    }
  }, [canMakeRequest, prefix]);
  
  /**
   * Safely update state only if data has changed
   * 
   * @param setState - setState function 
   * @param prevData - Previous data
   * @param newData - New data
   * @param dataKey - Identifier for debugging
   * @returns true if state was updated
   */
  const safeUpdateState = useCallback(<T>(
    setState: React.Dispatch<React.SetStateAction<T>>,
    prevData: T,
    newData: T,
    dataKey: string
  ): boolean => {
    // Check if data has actually changed
    if (!hasDataChanged(prevData, newData)) {
      console.log(`[${prefix}] Skipping state update for ${dataKey}, data unchanged`);
      return false;
    }
    
    // Update state
    setState(newData);
    return true;
  }, [prefix]);
  
  return {
    canMakeRequest,
    protectedFetch,
    safeUpdateState,
    renderCount: renderCount.current
  };
} 