# Component Organization Guide

This guide defines the standard naming conventions and organizational structure for React components in the virtualpytest project.

## Directory Structure

Components are organized by page/feature domain with a maximum depth of 2 folders:

```
/components/
├── common/                     # Shared components across pages
├── [pagename]/                 # Page-specific components
│   ├── [PageName]_Component.tsx
│   └── subfolder/              # Optional subfolder (max depth 2)
│       └── [PageName]_SubComponent.tsx
└── shared/                     # Shared utilities
    └── stores/                 # Zustand stores
```

## Naming Conventions

### File Naming Pattern
```
[PageName]_[ComponentPurpose].tsx
```

**Examples:**
- `Navigation_MenuNode.tsx`
- `DeviceManagement_CreateDialog.tsx`
- `UserInterface_StreamViewer.tsx`

### Component Export Names
- Keep **original component export names** unchanged
- Only rename the **file**, not the component itself
- Example: `UIMenuNode` component in `Navigation_MenuNode.tsx` file

### Directory Naming
- Use **lowercase** for directory names
- Use **descriptive** names matching the page they serve
- Examples: `navigation/`, `devicemanagement/`, `userinterface/`

## Component Categories by Page

### Common Components (`/common/`)
Shared components used across multiple pages:
- `Header.tsx`
- `Footer.tsx` 
- `ThemeToggle.tsx`

### Navigation Components (`/navigation/`)
NavigationEditor page components with `Navigation_` prefix:
- `Navigation_MenuNode.tsx`
- `Navigation_EdgeEditDialog.tsx`
- `Navigation_Toolbar.tsx`

### User Interface Components (`/userinterface/`)
UserInterface page components with `UserInterface_` prefix:
- `UserInterface_ScreenDefinitionEditor.tsx`
- `UserInterface_StreamViewer.tsx`
- `UserInterface_VerificationEditor.tsx`

### Device Management Components (`/devicemanagement/`)
DeviceManagement page components with `DeviceManagement_` prefix:
- `DeviceManagement_CreateDialog.tsx`
- `DeviceManagement_EditDialog.tsx`
- `wizard/DeviceManagement_BasicInfoStep.tsx`

### Models Components (`/models/`)
Models page components with `Models_` prefix:
- `Models_CreateDialog.tsx`

## Subfolder Organization

When components have logical subgroups, use one level of subfolders:

```
/devicemanagement/
├── DeviceManagement_CreateDialog.tsx
├── DeviceManagement_EditDialog.tsx
└── wizard/                     # Wizard-specific components
    ├── DeviceManagement_BasicInfoStep.tsx
    ├── DeviceManagement_ModelSelectionStep.tsx
    └── DeviceManagement_ControllerConfigStep.tsx
```

## Index Files

Each component directory should have an `index.ts` file for clean exports:

```typescript
// components/navigation/index.ts
export { default as NavigationBar } from './Navigation_Bar';
export { UIMenuNode } from './Navigation_MenuNode';
export { UINavigationNode } from './Navigation_NavigationNode';
export { NodeEditDialog } from './Navigation_NodeEditDialog';
// ... more exports
```

## Import Patterns

### Correct Import Patterns
```typescript
// Import from specific file
import { UIMenuNode } from '../components/navigation/Navigation_MenuNode';

// Import from index (when available)
import { Navigation_MenuNode } from '../components/navigation';

// Page component imports
import CreateDeviceDialog from '../components/devicemanagement/DeviceManagement_CreateDialog';
```

### Internal Component Imports
Within the same feature directory, use relative paths:
```typescript
// In DeviceManagement_CreateDialog.tsx
import { BasicInfoStep } from './wizard/DeviceManagement_BasicInfoStep';
import { ModelSelectionStep } from './wizard/DeviceManagement_ModelSelectionStep';
```

## Migration Checklist

When adding new components, follow this checklist:

### ✅ File Organization
- [ ] Place in correct page-based directory
- [ ] Use correct naming pattern `[PageName]_[Purpose].tsx`
- [ ] Keep component export names unchanged
- [ ] Create subfolder if component has 3+ related files

### ✅ Import Management  
- [ ] Update all import statements to new paths
- [ ] Search for old import patterns: `grep -r "from.*OldPath"`
- [ ] Test TypeScript compilation: `npx tsc --noEmit`
- [ ] Verify no broken imports remain

### ✅ Index Files
- [ ] Create or update `index.ts` in component directory
- [ ] Export all components for clean imports
- [ ] Follow consistent export patterns

### ✅ Documentation
- [ ] Update any documentation referencing file paths
- [ ] Add component to appropriate category in this guide
- [ ] Document any new naming patterns

## Examples by Component Type

### Dialog Components
```
[Domain]FormDialogClient.tsx     # For form dialogs
[Domain]DialogClient.tsx         # For other dialogs
```
Examples:
- `DeviceManagement_CreateDialog.tsx`
- `Models_CreateDialog.tsx`

### List/Table Components
```
[Domain]TableClient.tsx          # For table views
[Domain]ListClient.tsx           # For list views
```

### Form Components
```
[Domain]FormClient.tsx           # For standalone forms
[Domain]_[FormPurpose].tsx       # For specific form steps
```
Examples:
- `DeviceManagement_BasicInfoStep.tsx`
- `DeviceManagement_ModelSelectionStep.tsx`

### Wizard/Stepper Components
Use subfolder for 3+ wizard steps:
```
/wizard/
├── [Domain]_[Step1].tsx
├── [Domain]_[Step2].tsx
└── [Domain]_[Step3].tsx
```

## Shared Components (`/shared/`)

### Zustand Stores (`/shared/stores/`)
```
/shared/stores/
├── validationStore.ts
├── viewStore.ts
└── index.ts
```

### Shared Utilities
Place cross-page utilities in `/shared/` directory.

## Best Practices

### Do ✅
- Use descriptive, consistent naming
- Group related components in subfolders
- Maintain clean index.ts exports
- Update imports systematically during moves
- Preserve original component export names

### Don't ❌
- Create directories deeper than 2 levels
- Change component export names during file moves
- Leave broken import references
- Mix naming conventions within same directory
- Skip index.ts files for component directories

## Future Considerations

When adding new pages/features:

1. **Create new directory** following naming pattern
2. **Define component prefix** matching directory name
3. **Establish subfolder structure** if needed
4. **Create index.ts** for exports
5. **Update this guide** with new examples

## Migration History

This structure was established during a comprehensive migration in June 2024:
- **Phase 1**: Common Components (3 components)
- **Phase 2**: Navigation Components (17 components) 
- **Phase 3**: User Interface Components (8 components)
- **Phase 4**: Device Management Components (9 components)
- **Phase 5**: Models Components (1 component)

Total migrated: **38 components** with full import tracking and verification.

---

**Last Updated**: June 2024  
**Maintained By**: Development Team

For questions about component organization, refer to this guide or the migration plan documentation. 