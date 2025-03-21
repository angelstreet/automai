Here's a diagram showing the component usage and workflow for host and deployment features, including how to get CICD providers:

```
┌─────────────────────────┐                            
│  HostList Component     │                            
│  (Client)               │                            
└───────────┬─────────────┘                            
            │                                          
            │ useHosts()                               
            ▼                                          
┌─────────────────────────┐                            
│  HostContext            │                            
│  - hosts                │                            
│  - loading              │                            
│  - error                │                            
│  - fetchHosts()         │                            
│  - addHost()            │                            
│  - deleteHost()         │                            
│  - testConnection()     │                            
└───────────┬─────────────┘                            
            │                                          
            │ Server Actions Call                      
            ▼                                          
┌─────────────────────────┐                            
│  Host Actions           │                            
│  (Server)               │                            
│  - getHosts()           │                            
│  - addHost()            │                            
│  - deleteHost()         │                            
│  - testConnection()     │                            
└───────────┬─────────────┘                            
            │                                          
            │ DB Layer Call                            
            ▼                                          
┌─────────────────────────┐                            
│  Host DB Layer          │                            
│  - findMany()           │                            
│  - create()             │                            
│  - delete()             │                            
│  - testConnection()     │                            
└─────────────────────────┘                            

┌─────────────────────────┐
│ DeploymentWizard        │
│ Component (Client)      │
└───────────┬─────────────┘
            │
            │ useDeploymentContext()
            │ useCICDProviders()
            │ useCICDJobs()
            ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│ DeploymentContext       │         │ CICD Hooks              │
│ - createDeployment()    │         │ - providers             │
│ - loading               │         │ - jobs                  │
│ - error                 │         │ - loading               │
└───────────┬─────────────┘         └───────────┬─────────────┘
            │                                    │
            │ Server Actions Call                │ Server Actions Call
            ▼                                    ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│ Deployment Actions      │         │ CICD Actions            │
│ - createDeployment()    │         │ - getCICDProviders()    │
│ - getDeployments()      │         │ - getCICDJobs()         │
└───────────┬─────────────┘         └───────────┬─────────────┘
            │                                    │
            │ DB Layer Call                      │ DB Layer Call
            ▼                                    ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│ Deployment DB Layer     │         │ CICD DB Layer           │
│ - create()              │         │ - getCICDProvider()     │
│ - findMany()            │         │ - getCICDJobs()         │
└─────────────────────────┘         └─────────────────────────┘
```

The workflow should be:

1. **For Host Management:**
   - Components use `useHosts()` hook from HostContext
   - HostContext calls server actions (addHost, deleteHost, etc.)
   - Server actions call DB layer functions
   - Results flow back up the chain with proper state management

2. **For Deployment with CICD:**
   - Components use `useDeploymentContext()` and CICD hooks
   - DeploymentContext handles deployment state and actions
   - CICD hooks fetch provider/job data from CICD actions
   - Both action types call their respective DB layer functions
   - Results are cached at the action layer and passed back to components

This maintains separation of concerns while providing a clean, consistent data flow through your application.

src/
  app/
    [locale]/
      [tenant]/
        hosts/
          _components/
            HostList.tsx
            HostCard.tsx
            ...
          actions.ts     // Server actions
          types.ts       // Type definitions
          constants.ts   // Constants
          context.tsx    // HostContext with all hooks bundled inside
          page.tsx       // Page component  

'use client';

import React, { createContext, useContext, useState } from 'react';
import { Host } from './types';
import { getHosts, addHost, deleteHost, testConnection } from './actions';

// Context type
interface HostContextType {
  hosts: Host[];
  loading: boolean;
  error: string | null;
  fetchHosts: () => Promise<void>;
  addHost: (data: Partial<Host>) => Promise<Host | null>;
  deleteHost: (id: string) => Promise<boolean>;
  testConnection: (hostId: string) => Promise<boolean>;
}

// Create context
const HostContext = createContext<HostContextType | undefined>(undefined);

// Provider component
export function HostProvider({ children }: { children: React.ReactNode }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Implement all functions that will be exposed through the context
  
  const fetchHosts = async () => {
    // Implementation
  };

  const addHostImpl = async (data: Partial<Host>) => {
    // Implementation
  };

  // ... other functions
  
  return (
    <HostContext.Provider 
      value={{ 
        hosts, 
        loading, 
        error, 
        fetchHosts, 
        addHost: addHostImpl,
        deleteHost, 
        testConnection 
      }}
    >
      {children}
    </HostContext.Provider>
  );
}

// Hook to use the context
export function useHosts() {
  const context = useContext(HostContext);
  if (context === undefined) {
    throw new Error('useHosts must be used within a HostProvider');
  }
  return context;
}