# React Server Components Migration: Phase 2

*Date: May 2024*

## Remaining Components Migration Plan

This document outlines the plan for migrating the remaining components that are still using the old context-based architecture to React Server Components (RSC).

## Table of Contents

1. [Components to Migrate](#components-to-migrate)
2. [Migration Approach for Deployment Wizard Components](#migration-approach-for-deployment-wizard-components)
3. [Migration Approach for Host List Components](#migration-approach-for-host-list-components)
4. [Migration Approach for CICD Components](#migration-approach-for-cicd-components)
5. [Migration Approach for Terminal Components](#migration-approach-for-terminal-components)
6. [Implementation Timeline](#implementation-timeline)
7. [Migration Validation Checklist](#migration-validation-checklist)

## Components to Migrate

The following components still need to be migrated from context-based architecture to RSC:

1. **Main Module Components**:
   - `/src/app/[locale]/[tenant]/hosts/_components/HostList.tsx` - Still using useHost
   - `/src/app/[locale]/[tenant]/deployment/_components/DeploymentWizard.tsx` - Using both useHost and useCICD
   - `/src/app/[locale]/[tenant]/deployment/_components/DeploymentWizardStep5.tsx` - Using contexts
   - `/src/app/[locale]/[tenant]/hosts/_components/ConnectionForm.tsx` - Using contexts
   - `/src/app/[locale]/[tenant]/hosts/terminals/page.tsx` - Likely using contexts

2. **Additional Components**:
   - Legacy CICD components (most of these should be replaced by the new ClientCICDProvider)
   - Some deployment components that still reference the old contexts

## Migration Approach for Deployment Wizard Components

### Analysis
The Deployment Wizard is a multi-step form with interdependencies between steps and relies on both Host and CICD contexts for data.

### Migration Steps

1. **Create Server Actions**:
   ```typescript
   // /src/app/actions/deploymentWizard.ts
   'use server'
   
   import { getRepositoriesForDeployment } from './repositories';
   import { getHosts } from './hosts';
   import { getCICDProviders } from './cicd';
   
   export async function getDeploymentWizardData() {
     // Fetch all required data in parallel
     const [repositoriesResult, hostsResult, cicdProvidersResult] = await Promise.all([
       getRepositoriesForDeployment(),
       getHosts(),
       getCICDProviders()
     ]);
     
     return {
       repositories: repositoriesResult.success ? repositoriesResult.data : [],
       hosts: hostsResult.success ? hostsResult.data : [],
       cicdProviders: cicdProvidersResult.success ? cicdProvidersResult.data : []
     };
   }
   
   export async function saveDeploymentConfiguration(formData: DeploymentFormData) {
     // Implementation to save the deployment configuration
   }
   
   export async function startDeployment(deploymentId: string) {
     // Implementation to start the deployment
   }
   ```

2. **Create a Server Component Wrapper**:
   ```tsx
   // /src/app/[locale]/[tenant]/deployment/_components/DeploymentWizardContainer.tsx
   import { getDeploymentWizardData } from '@/app/actions/deploymentWizard';
   import ClientDeploymentWizard from './client/ClientDeploymentWizard';

   export default async function DeploymentWizardContainer({
     onCancel,
     onDeploymentCreated,
   }) {
     // Fetch all required data on the server
     const { repositories, hosts, cicdProviders } = await getDeploymentWizardData();
     
     return (
       <ClientDeploymentWizard
         initialRepositories={repositories}
         initialHosts={hosts}
         initialCICDProviders={cicdProviders}
         onCancel={onCancel}
         onDeploymentCreated={onDeploymentCreated}
       />
     );
   }
   ```

3. **Convert DeploymentWizard to Client Component**:
   ```tsx
   // /src/app/[locale]/[tenant]/deployment/_components/client/ClientDeploymentWizard.tsx
   'use client'
   
   import { useState, useTransition } from 'react';
   import { saveDeploymentConfiguration, startDeployment } from '@/app/actions/deploymentWizard';
   import { useToast } from '@/components/shadcn/use-toast';
   
   export default function ClientDeploymentWizard({
     initialRepositories,
     initialHosts,
     initialCICDProviders,
     onCancel,
     onDeploymentCreated,
   }) {
     const [currentStep, setCurrentStep] = useState(1);
     const [formData, setFormData] = useState(initialDeploymentData);
     const [isPending, startTransition] = useTransition();
     const { toast } = useToast();
     
     // Step handling logic here
     
     const handleSubmit = async () => {
       startTransition(async () => {
         try {
           const result = await saveDeploymentConfiguration(formData);
           if (result.success) {
             if (formData.autoStart) {
               await startDeployment(result.data.id);
             }
             toast({ title: "Deployment created successfully" });
             onDeploymentCreated?.();
           } else {
             toast({ 
               title: "Failed to create deployment", 
               variant: "destructive",
               description: result.error 
             });
           }
         } catch (error) {
           toast({
             title: "An error occurred",
             variant: "destructive",
             description: String(error)
           });
         }
       });
     };
     
     // Return component JSX
   }
   ```

4. **Migrate Wizard Steps to Client Components**:
   - Move each step component to `/client/` subdirectory
   - Remove context dependencies
   - Pass data as props from parent

## Migration Approach for Host List Components

### Analysis
HostList.tsx is a complex component with filtering, connection testing, and CRUD operations.

### Migration Steps

1. **Update the Host Server Actions**:
   Ensure all necessary actions for HostList are available in `/src/app/actions/hosts.ts`

2. **Create a Server Component for Loading Host Data**:
   ```tsx
   // /src/app/[locale]/[tenant]/hosts/_components/HostListContainer.tsx
   import { getHosts } from '@/app/actions/hosts';
   import ClientHostListManager from './client/ClientHostListManager';
   
   export default async function HostListContainer() {
     // Fetch hosts on the server
     const { success, data: hosts = [], error } = await getHosts();
     
     return <ClientHostListManager initialHosts={hosts} />;
   }
   ```

3. **Create the Client Component for Host Management**:
   ```tsx
   // /src/app/[locale]/[tenant]/hosts/_components/client/ClientHostListManager.tsx
   'use client'
   
   import { useState, useTransition, useOptimistic } from 'react';
   import { 
     createHost, 
     updateHost, 
     deleteHost, 
     testHostConnection 
   } from '@/app/actions/hosts';
   import { useToast } from '@/components/shadcn/use-toast';
   
   export default function ClientHostListManager({ initialHosts }) {
     const [hosts, setHosts] = useState(initialHosts);
     const [isPending, startTransition] = useTransition();
     const { toast } = useToast();
     
     // Set up optimistic updates
     const [optimisticHosts, addOptimisticHost] = useOptimistic(
       hosts,
       (state, update) => {
         // Handle different update types (add, delete, update, status change)
         // Return the updated state
       }
     );
     
     // Functions for adding, updating, deleting, and testing hosts
     // using server actions with optimistic updates
     
     return (
       <HostListUI 
         hosts={optimisticHosts} 
         onAddHost={handleAddHost}
         onUpdateHost={handleUpdateHost}
         onDeleteHost={handleDeleteHost}
         onTestConnection={handleTestConnection}
         isLoading={isPending}
       />
     );
   }
   ```

4. **Create a Pure UI Component**:
   ```tsx
   // /src/app/[locale]/[tenant]/hosts/_components/client/HostListUI.tsx
   'use client'
   
   export default function HostListUI({
     hosts,
     onAddHost,
     onUpdateHost,
     onDeleteHost,
     onTestConnection,
     isLoading
   }) {
     // UI rendering logic without data fetching
   }
   ```

## Migration Approach for CICD Components

### Analysis
Most CICD components have already been migrated, but a few legacy components still reference the old contexts.

### Migration Steps

1. **Update DeploymentWizardStep5.tsx**:
   - Remove CICD context dependencies
   - Pass CICD providers as props from the parent
   - Use server actions directly for any data fetching needs

2. **Any remaining CICDProvider references**:
   - Replace with ClientCICDProvider or appropriate server/client components
   - Update imports to use the new structure

## Migration Approach for Terminal Components

### Analysis
Terminal components handle interactive SSH sessions and need special consideration.

### Migration Steps

1. **Create New Server Actions**:
   ```typescript
   // /src/app/actions/terminals.ts
   'use server'
   
   export async function initTerminal(hostId: string) {
     // Initialize terminal session
   }
   
   export async function closeTerminal(sessionId: string) {
     // Close terminal session
   }
   ```

2. **Create Server Component for Loading Host Data**:
   ```tsx
   // /src/app/[locale]/[tenant]/hosts/terminals/[hostName]/page.tsx
   import { getHostById } from '@/app/actions/hosts';
   import { params } from 'next/navigation';
   import ClientTerminal from './_components/client/ClientTerminal';
   
   export default async function TerminalPage() {
     const { hostName } = params();
     const hostResult = await getHostById(hostName);
     
     if (!hostResult.success) {
       // Handle error
       return <div>Failed to load host information</div>;
     }
     
     return <ClientTerminal host={hostResult.data} />;
   }
   ```

3. **Keep Terminal Logic in Client Component**:
   ```tsx
   // /src/app/[locale]/[tenant]/hosts/terminals/[hostName]/_components/client/ClientTerminal.tsx
   'use client'
   
   import { useEffect, useRef } from 'react';
   import { initTerminal, closeTerminal } from '@/app/actions/terminals';
   
   export default function ClientTerminal({ host }) {
     const terminalRef = useRef(null);
     
     useEffect(() => {
       // Initialize terminal when component mounts
       let sessionId = null;
       
       const setup = async () => {
         const result = await initTerminal(host.id);
         if (result.success) {
           sessionId = result.data.sessionId;
           // Set up terminal with xterm.js or whatever terminal library is used
         }
       };
       
       setup();
       
       // Clean up
       return () => {
         if (sessionId) {
           closeTerminal(sessionId);
         }
       };
     }, [host.id]);
     
     return <div ref={terminalRef} className="terminal-container" />;
   }
   ```

## Implementation Timeline

### Phase 1: Preparations (Week 1)
- Create missing server actions
- Set up error handling and validation

### Phase 2: HostList Components (Week 1-2)
- Implement HostListContainer and ClientHostListManager
- Test and validate functionality

### Phase 3: Deployment Wizard (Week 2-3)
- Migrate DeploymentWizard components
- Implement server and client component split

### Phase 4: Terminal and Remaining Components (Week 3-4)
- Migrate Terminal components
- Clean up any remaining context references

### Phase 5: Testing and Documentation (Week 4)
- Comprehensive testing of all migrated components
- Update documentation with new patterns
- Validate performance and UX

## Migration Validation Checklist

For each component:

- [ ] All context dependencies removed
- [ ] Data fetching moved to server components
- [ ] Interactive elements properly isolated in client components
- [ ] Proper error handling implemented
- [ ] Loading states and Suspense boundaries added
- [ ] Performance tested (bundle size, load time)
- [ ] UI functions identically to pre-migration