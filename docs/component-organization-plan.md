# Component Organization Plan

## Current Issues

1. **Inconsistent folder structure**: The current components folder structure doesn't fully align with our best practices defined in `nextjs.mdc` and `code-organization.mdc`.

2. **Shadcn UI components**: We need to ensure Shadcn UI components in `src/components/ui/` remain untouched and are properly exempted from refactoring.

3. **Large components**: Several components exceed the 300-line limit and need proper refactoring.

4. **Sidebar component**: The sidebar component in `src/components/ui/` is a heavily customized Shadcn UI component that needs special handling.

## Proposed Structure

```
src/
├── components/
│   ├── ui/                  # Shadcn UI components ONLY (do not modify)
│   ├── common/              # Shared custom components
│   │   ├── Button/          # Example of a refactored component
│   │   │   ├── index.tsx    # Main component
│   │   │   └── ButtonIcon.tsx # Subcomponent
│   │   └── ...
│   ├── layout/              # Layout components
│   │   ├── Sidebar/         # Custom sidebar (if needed)
│   │   │   ├── index.tsx
│   │   │   ├── SidebarHeader.tsx
│   │   │   └── ...
│   │   └── ...
│   ├── feature1/            # Feature-specific components
│   ├── feature2/            # Feature-specific components
│   └── ...
└── app/
    └── [locale]/
        └── [tenant]/
            └── feature/
                ├── page.tsx
                ├── actions.ts
                └── _components/  # Page-specific components
```

## Action Plan

### Phase 1: Assessment and Preparation

1. **Audit all components**:
   - Identify all Shadcn UI components in `src/components/ui/`
   - Identify custom components that should be moved or refactored
   - Determine which components are page-specific vs. shared

2. **Create new directory structure**:
   - Create `src/components/common/` for shared custom components
   - Organize feature-specific directories

3. **Update health check script**:
   - Ensure proper exemption for Shadcn UI components
   - Add warnings for attempting to refactor Shadcn UI components

### Phase 2: Component Migration

1. **Handle the sidebar component**:
   - If it's a custom component: Move to `src/components/layout/Sidebar/`
   - If it's a Shadcn UI component: Keep in `ui/` and create a custom extension if needed

2. **Refactor large components**:
   - Start with `pin-input.tsx` (428 lines)
   - Move to appropriate directory structure
   - Break down into smaller components

3. **Move page-specific components**:
   - Identify components that should be in the app directory
   - Move them to appropriate `_components` directories

### Phase 3: Import Updates and Testing

1. **Update imports**:
   - Fix all import statements across the codebase
   - Ensure backward compatibility where needed

2. **Testing**:
   - Test each refactored component
   - Verify no regressions in functionality
   - Check for console errors

## Implementation Guidelines

1. **One component at a time**:
   - Commit before starting each component refactor
   - Complete one component before moving to the next
   - Commit after each component is refactored

2. **Verification**:
   - Check the terminal for errors after each refactor
   - Verify the application reloads without errors
   - Check for console errors

3. **Documentation**:
   - Update component documentation as needed
   - Document any changes to component APIs

## Next Steps

1. Get approval for this plan
2. Begin with Phase 1: Assessment and Preparation
3. Proceed with Phase 2 for each component, one at a time
4. Complete Phase 3 for each component before moving to the next 