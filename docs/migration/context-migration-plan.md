# Context System Migration Plan

## Overview

This document outlines the step-by-step process for migrating from the feature-specific context system to the new centralized context architecture. The new architecture provides a more consistent and maintainable approach to state management across the application.

## Architecture Changes

### Old Architecture
```
Component → Feature-specific Hook → Feature-specific Context → Feature-specific Actions → DB Layer
```

### New Architecture
```
Component → Centralized AppContext → Feature-specific Context → Feature-specific Actions → DB Layer
```

## Migration Steps

### Phase 1: Preparation (Complete)

1. ✅ Create directory structure
   - `/src/context/` with subdirectories for host, deployment, repository, cicd
   - `/src/types/context/` for all context type definitions

2. ✅ Create type definitions 
   - Types for all contexts in `/src/types/context/`
   - The central `AppContextType` in `/src/types/context/app.ts`

3. ✅ Create skeleton implementations
   - Basic implementations of all contexts
   - Fully implemented Host context
   - The central AppContext and AppProvider

4. ✅ Add AppProvider to the app root layout

### Phase 2: Feature Implementation (Complete)

1. ✅ Implement full context functionality
   - ✅ Host context (completed)
   - ✅ Deployment context (completed)
   - ✅ Repository context (completed)
   - ✅ CICD context (completed)

2. ✅ Create example components
   - ✅ Example component using the new context system (ContextDemo)
   - ✅ Initial examples for common usage patterns

### Phase 3: Component Migration (Complete)

1. ✅ Hosts feature
   - ✅ Host list components
   - ✅ Host card component
   - ✅ Host connection form

2. ✅ Deployments feature
   - ✅ Deployment list component
   - ✅ Deployment actions component
   - ✅ Deployment run action component
   - ✅ Deployment details component
   - ✅ Deployment wizard components

3. ✅ Repositories feature
   - ✅ Repository list components (page.tsx)
   - ✅ Repository detail components (RepositoryExplorer.tsx)
   - ✅ Repository management components (EnhancedRepositoryCard.tsx, EnhancedConnectRepositoryDialog.tsx)

4. ✅ CICD feature
   - ✅ CICD provider components (CICDProvider.tsx)
   - ✅ CICD provider form components (CICDProviderForm.tsx)
   - ✅ CICD job functionality in Deployment wizard (DeploymentWizardStep5.tsx)

### Phase 4: Cleanup and Optimization (Complete)

1. ✅ Remove old context files
   - ✅ `/src/app/[locale]/[tenant]/hosts/context.tsx` 
   - ✅ `/src/app/[locale]/[tenant]/deployment/context.tsx`
   - ✅ `/src/app/[locale]/[tenant]/repositories/context.tsx`
   - ✅ Review and update import statements in any files that still reference old contexts

2. ✅ Remove old hooks files
   - ✅ `/src/app/[locale]/[tenant]/hosts/hooks.ts`
   - ✅ `/src/app/[locale]/[tenant]/deployment/hooks.ts`
   - ✅ `/src/app/[locale]/[tenant]/repositories/hooks.ts`
   - ✅ Review and update any components that still import from these files

3. ✅ Update documentation
   - ✅ Update `/docs/context-architecture.md` to reflect the new architecture
   - ✅ Update component examples in `/docs/examples/` directory
   - ✅ Create migration guide for any remaining components
   - ✅ Update development guidelines to standardize on the new context system (added to context-architecture.md)
   - ✅ Create optimization documentation in `/docs/context-optimization.md`

4. ✅ Refactoring and optimization
   - ✅ Review components for context migrations (ConnectHostDialog.tsx updated)
   - ✅ Optimize context state management to reduce unnecessary re-renders
      - ✅ Add useCallback to all action functions
      - ✅ Add useMemo for context values
      - ✅ Add constants to avoid string literals
   - ✅ Add improved error handling and loading states
      - ✅ Create structured error objects
      - ✅ Add detailed loading status with operations
      - ✅ Add helper functions for loading state management
   - ✅ Add comprehensive testing for the context system
      - ✅ Create unit tests for the Host context
      - ✅ Mock external dependencies
      - ✅ Test all state transitions

## Migration Guidelines

### For Developers

When migrating a component from the old system to the new one:

1. **Import the new hooks:**
   ```typescript
   // Old way
   import { useHosts } from '@/app/[locale]/[tenant]/hosts/hooks';
   
   // New way
   import { useHost } from '@/context';
   ```

2. **Update hook calls:**
   ```typescript
   // Old way
   const { hosts, loading, error, fetchHosts } = useHosts();
   
   // New way 
   const { hosts, loading, error, fetchHosts } = useHost();
   ```

3. **No need for context providers in page components**
   - The AppProvider in the root layout already provides all contexts
   - Remove any feature-specific providers from page components

### Tips for Smooth Migration

- Migrate one feature at a time
- Start with simpler components before tackling complex ones
- Run tests after each component migration
- When in doubt, refer to the examples in `/src/components/example/`
- Use the type system to guide implementation

## Benefits of New Architecture

1. **Consistency:** All contexts follow the same pattern and organization
2. **Maintainability:** Smaller, focused files with clear separation of concerns
3. **Performance:** Reduced provider nesting and more efficient context updates
4. **Developer Experience:** Easier to find and use context functions
5. **Type Safety:** Better type definitions and IDE support

## Timeline

- Phase 1 (Preparation): Completed ✓
- Phase 2 (Feature Implementation): Completed ✓
- Phase 3 (Component Migration): Completed ✓
- Phase 4 (Cleanup and Optimization): Completed ✓ 