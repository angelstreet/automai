/**
 * Context Utilities for preventing infinite loops and redundant fetches
 */

/**
 * Helper to create a request tracker object
 * Used to prevent multiple simultaneous requests
 */
export const createRequestTracker = () => {
  const tracker: Record<string, boolean> = {};

  return {
    /**
     * Check if a request is in flight
     * @param key - Unique identifier for the request
     * @returns true if the request is already in flight
     */
    isRequestInFlight: (key: string): boolean => {
      return !!tracker[key];
    },

    /**
     * Mark a request as started
     * @param key - Unique identifier for the request
     */
    startRequest: (key: string) => {
      tracker[key] = true;
    },

    /**
     * Mark a request as completed
     * @param key - Unique identifier for the request
     */
    completeRequest: (key: string) => {
      tracker[key] = false;
    },
  };
};

/**
 * Helper to check if data has actually changed
 * Prevents unnecessary state updates
 *
 * @param prevData - Previous data
 * @param newData - New data
 * @returns true if data is different
 */
export const hasDataChanged = <T>(prevData: T, newData: T): boolean => {
  // Quick reference check
  if (prevData === newData) return false;

  // Deep comparison
  try {
    return JSON.stringify(prevData) !== JSON.stringify(newData);
  } catch (e) {
    // If stringify fails (circular references, etc.), fall back to considering them different
    return true;
  }
};

/**
 * Creates a safer setState function that only updates if data has changed
 *
 * @param setState - React setState function
 * @returns A function that updates state only when necessary
 */
export const createSafeSetState = <T>(
  setState: React.Dispatch<React.SetStateAction<T>>,
  debugPrefix?: string,
) => {
  return (newState: T | ((prev: T) => T)) => {
    if (typeof newState === 'function') {
      // For functional updates, we need to call the function
      setState((prev) => {
        const updated = (newState as (prev: T) => T)(prev);
        const changed = hasDataChanged(prev, updated);

        if (debugPrefix && !changed) {
          console.log(`[${debugPrefix}] Skipping state update, no actual changes`);
        }

        return changed ? updated : prev;
      });
    } else {
      // For direct updates, compare with previous
      setState((prev) => {
        const changed = hasDataChanged(prev, newState);

        if (debugPrefix && !changed) {
          console.log(`[${debugPrefix}] Skipping state update, no actual changes`);
        }

        return changed ? newState : prev;
      });
    }
  };
};
