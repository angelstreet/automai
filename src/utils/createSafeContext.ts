import React, { useContext, createContext, useState, useCallback, useEffect, useRef } from 'react';
import { useRequestProtection } from '@/hooks/useRequestProtection';

/**
 * Creates a context provider with built-in protection against infinite loops
 * 
 * @param options - Configuration options
 * @returns Context, Provider, and hook
 */
export function createSafeContext<TState, TActions, TContext extends TState & TActions>(
  options: {
    /** Context name for debugging */
    name: string;
    /** Initial state */
    initialState: TState;
    /** Factory function to create actions */
    createActions: (
      state: TState,
      setState: React.Dispatch<React.SetStateAction<TState>>,
      protectedFetch: <T>(key: string, fn: () => Promise<T>) => Promise<T | null>,
      safeUpdateState: <T>(
        setState: React.Dispatch<React.SetStateAction<T>>,
        prevData: T,
        newData: T,
        dataKey: string
      ) => boolean
    ) => TActions;
    /** Optional function to run on provider initialization */
    onInitialize?: (actions: TActions) => Promise<void>;
    /** Whether to throw if the context is used outside a provider */
    requireProvider?: boolean;
  }
) {
  const Context = createContext<TContext | undefined>(undefined);
  
  const Provider = ({ children }: { children: React.ReactNode }) => {
    // State management
    const [state, setState] = useState<TState>(options.initialState);
    
    // Protection against infinite loops
    const { protectedFetch, safeUpdateState, renderCount } = useRequestProtection(options.name);
    
    // Create actions with protection
    const actions = options.createActions(state, setState, protectedFetch, safeUpdateState);
    
    // Combine state and actions
    const contextValue = { ...state, ...actions } as TContext;
    
    // Track initialization
    const didInitialize = useRef(false);
    
    // Initialize once
    useEffect(() => {
      const initialize = async () => {
        if (didInitialize.current) {
          console.log(`[${options.name}] Already initialized, skipping`);
          return;
        }
        
        console.log(`[${options.name}] Initializing context (render #${renderCount})`);
        didInitialize.current = true;
        
        if (options.onInitialize) {
          await options.onInitialize(actions);
        }
      };
      
      initialize();
      
      return () => {
        console.log(`[${options.name}] Context unmounting`);
        didInitialize.current = false;
      };
    }, []);
    
    return (
      <Context.Provider value={contextValue}>
        {children}
      </Context.Provider>
    );
  };
  
  // Create hook with error handling
  const useCtx = (): TContext => {
    const context = useContext(Context);
    
    if (context === undefined) {
      if (options.requireProvider) {
        throw new Error(`use${options.name} must be used within a ${options.name}Provider`);
      } else {
        console.warn(`use${options.name} used outside ${options.name}Provider, returning null`);
        return null as unknown as TContext;
      }
    }
    
    return context;
  };
  
  return { Context, Provider, useCtx };
} 