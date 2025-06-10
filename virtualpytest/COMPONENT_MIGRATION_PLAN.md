# Component Reorganization Migration Plan

## Overview
This document tracks the comprehensive reorganization of components from the current scattered structure to a page-based organization with consistent naming conventions.

## Migration Strategy
1. **Create new directory structure**
2. **Move files one domain at a time**
3. **Update imports after each domain**
4. **Test imports after each domain**
5. **Remove old empty directories**

## New Naming Convention
- **Pattern**: `[PageName]_[ComponentPurpose].tsx`
- **Examples**: `Navigation_MenuNode.tsx`, `DeviceManagement_CreateDialog.tsx`

---

## 📁 NEW DIRECTORY STRUCTURE

```
/components/
├── common/                                    # Shared/common components
├── dashboard/                                 # Dashboard page components  
├── navigation/                                # NavigationEditor page components
├── userinterface/                            # UserInterface page components
├── devicemanagement/                         # DeviceManagement page components
│   └── wizard/                               # Device wizard subcomponents
├── models/                                   # Models page components
├── testcaseeditor/                          # TestCaseEditor page components
├── campaigneditor/                          # CampaignEditor page components
├── controller/                              # Controller page components
│   ├── remote/                               # Remote controller components
│   ├── power/                                # Power control components
│   └── modals/                               # Controller modals
├── environment/                             # Environment page components
├── runtests/                               # RunTests page components
│   ├── validation/                           # Test validation components
│   └── verification/                         # Test verification components
├── testreports/                            # TestReports page components
├── library/                                # Library page components
├── monitoring/                             # Monitoring page components
├── collections/                            # Collections page components
├── shared/                                 # Shared utilities and stores
│   └── stores/                              # Zustand stores
└── index.ts                               # Main components index
```

---

## 🔄 MIGRATION PHASES

### Phase 1: Common Components
**Status**: ✅ **COMPLETED**

| Current File | New File | Import Updates Required |
|-------------|----------|-------------------------|
| ✅ `Header.tsx` | ✅ `common/Header.tsx` | ✅ `App.tsx` |
| ✅ `Footer.tsx` | ✅ `common/Footer.tsx` | ✅ `App.tsx` |
| ✅ `ThemeToggle.tsx` | ✅ `common/ThemeToggle.tsx` | ✅ `App.tsx` |

**Import Updates for Phase 1:**
```typescript
// automai/virtualpytest/src/web/App.tsx
// OLD:
import ThemeToggle from './components/ThemeToggle';
import Footer from './components/Footer';

// NEW: ✅ COMPLETED
import ThemeToggle from './components/common/ThemeToggle';
import Footer from './components/common/Footer';
```

**Phase 1 Verification Completed:**
- ✅ **Files moved successfully**: All common components moved to `/common/` directory
- ✅ **Import updates applied**: App.tsx imports updated to new paths
- ✅ **No old import references**: Grep search confirms no remaining old imports
- ✅ **Directory structure created**: New component structure established
- ✅ **Index.ts created**: Clean exports available for common components

### Phase 2: Navigation Components  
**Status**: ✅ **COMPLETED**

| Current File | New File | Import Updates Required |
|-------------|----------|-------------------------|
| ✅ `navigation/NavigationEditorHeader.tsx` | ✅ `navigation/Navigation_EditorHeader.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/UIMenuNode.tsx` | ✅ `navigation/Navigation_MenuNode.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/UINavigationNode.tsx` | ✅ `navigation/Navigation_NavigationNode.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/UINavigationEdge.tsx` | ✅ `navigation/Navigation_NavigationEdge.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/NodeEditDialog.tsx` | ✅ `navigation/Navigation_NodeEditDialog.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/EdgeEditDialog.tsx` | ✅ `navigation/Navigation_EdgeEditDialog.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/NodeSelectionPanel.tsx` | ✅ `navigation/Navigation_NodeSelectionPanel.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/EdgeSelectionPanel.tsx` | ✅ `navigation/Navigation_EdgeSelectionPanel.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/NodeVerificationsList.tsx` | ✅ `navigation/Navigation_NodeVerificationsList.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/EdgeActionsList.tsx` | ✅ `navigation/Navigation_EdgeActionsList.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/EdgeActionItem.tsx` | ✅ `navigation/Navigation_EdgeActionItem.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/NodeGotoPanel.tsx` | ✅ `navigation/Navigation_NodeGotoPanel.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/NavigationToolbar.tsx` | ✅ `navigation/Navigation_Toolbar.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/NavigationDropdown.tsx` | ✅ `navigation/Navigation_Dropdown.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/NavigationBar.tsx` | ✅ `navigation/Navigation_Bar.tsx` | ✅ `App.tsx`, `NavigationEditor.tsx` |
| ✅ `navigation/StatusMessages.tsx` | ✅ `navigation/Navigation_StatusMessages.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `navigation/TreeFilterControls.tsx` | ✅ `navigation/Navigation_TreeFilterControls.tsx` | ✅ `NavigationEditor.tsx` |

**Import Updates for Phase 2:**
```typescript
// automai/virtualpytest/src/web/pages/NavigationEditor.tsx
// OLD:
import { UINavigationNode } from '../components/navigation/UINavigationNode';
import { UIMenuNode } from '../components/navigation/UIMenuNode';
import { UINavigationEdge } from '../components/navigation/UINavigationEdge';
import { NodeEditDialog } from '../components/navigation/NodeEditDialog';
import { EdgeEditDialog } from '../components/navigation/EdgeEditDialog';
import { EdgeSelectionPanel } from '../components/navigation/EdgeSelectionPanel';
import { NodeSelectionPanel } from '../components/navigation/NodeSelectionPanel';
import { NavigationEditorHeader } from '../components/navigation/NavigationEditorHeader';

// NEW: ✅ COMPLETED
import { UINavigationNode } from '../components/navigation/Navigation_NavigationNode';
import { UIMenuNode } from '../components/navigation/Navigation_MenuNode';
import { UINavigationEdge } from '../components/navigation/Navigation_NavigationEdge';
import { NodeEditDialog } from '../components/navigation/Navigation_NodeEditDialog';
import { EdgeEditDialog } from '../components/navigation/Navigation_EdgeEditDialog';
import { EdgeSelectionPanel } from '../components/navigation/Navigation_EdgeSelectionPanel';
import { NodeSelectionPanel } from '../components/navigation/Navigation_NodeSelectionPanel';
import { NavigationEditorHeader } from '../components/navigation/Navigation_EditorHeader';

// automai/virtualpytest/src/web/App.tsx
// OLD:
import NavigationBar from './components/navigation/NavigationBar';

// NEW: ✅ COMPLETED
import NavigationBar from './components/navigation/Navigation_Bar';
```

**Internal Import Updates for Navigation:**
```typescript
// components/user-interface/VerificationEditor.tsx
// OLD:
import { NodeVerificationsList } from '../navigation/NodeVerificationsList';

// NEW: ✅ COMPLETED
import { NodeVerificationsList } from '../navigation/Navigation_NodeVerificationsList';
```

**Phase 2 Verification Completed:**
- ✅ **Files moved successfully**: All 17 navigation components renamed with Navigation_ prefix
- ✅ **Import updates applied**: NavigationEditor.tsx and App.tsx imports updated to new paths
- ✅ **Internal imports fixed**: VerificationEditor.tsx import updated
- ✅ **No old import references**: Grep search confirms no remaining old imports
- ✅ **Index.ts created**: Clean exports available for navigation components
- ✅ **Component exports verified**: All components use original export names with new file paths

### Phase 3: User Interface Components
**Status**: ✅ **COMPLETED**

| Current File | New File | Import Updates Required |
|-------------|----------|-------------------------|
| ✅ `user-interface/ScreenDefinitionEditor.tsx` | ✅ `userinterface/UserInterface_ScreenDefinitionEditor.tsx` | ✅ `NavigationEditor.tsx` |
| ✅ `user-interface/ScreenEditorOverlay.tsx` | ✅ `userinterface/UserInterface_ScreenEditorOverlay.tsx` | Internal |
| ✅ `user-interface/StreamViewer.tsx` | ✅ `userinterface/UserInterface_StreamViewer.tsx` | ✅ `HDMIStreamPanel.tsx` |
| ✅ `user-interface/StreamClickOverlay.tsx` | ✅ `userinterface/UserInterface_StreamClickOverlay.tsx` | Internal |
| ✅ `user-interface/VerificationEditor.tsx` | ✅ `userinterface/UserInterface_VerificationEditor.tsx` | Internal |
| ✅ `user-interface/VideoCapture.tsx` | ✅ `userinterface/UserInterface_VideoCapture.tsx` | Internal |
| ✅ `user-interface/ScreenshotCapture.tsx` | ✅ `userinterface/UserInterface_ScreenshotCapture.tsx` | Internal |
| ✅ `user-interface/DragSelectionOverlay.tsx` | ✅ `userinterface/UserInterface_DragSelectionOverlay.tsx` | Internal |

**Import Updates for Phase 3:**
```typescript
// automai/virtualpytest/src/web/pages/NavigationEditor.tsx
// OLD:
import { ScreenDefinitionEditor } from '../components/user-interface/ScreenDefinitionEditor';

// NEW: ✅ COMPLETED
import { ScreenDefinitionEditor } from '../components/userinterface/UserInterface_ScreenDefinitionEditor';

// components/remote/HDMIStreamPanel.tsx
// OLD:
import { StreamViewer } from '../user-interface/StreamViewer';

// NEW: ✅ COMPLETED
import { StreamViewer } from '../userinterface/UserInterface_StreamViewer';
```

**Phase 3 Verification Completed:**
- ✅ **Files moved successfully**: All 8 userinterface components moved and renamed with UserInterface_ prefix
- ✅ **Import updates applied**: NavigationEditor.tsx and HDMIStreamPanel.tsx imports updated to new paths
- ✅ **No old import references**: Grep search confirms no remaining old imports
- ✅ **Index.ts created**: Clean exports available for userinterface components
- ✅ **Old directory removed**: Empty user-interface directory cleaned up

### Phase 4: Device Management Components
**Status**: ✅ **COMPLETED**

| Current File | New File | Import Updates Required |
|-------------|----------|-------------------------|
| ✅ `CreateDeviceDialog.tsx` | ✅ `devicemanagement/DeviceManagement_CreateDialog.tsx` | ✅ `DeviceManagement.tsx`, `index.ts` |
| ✅ `EditDeviceDialog.tsx` | ✅ `devicemanagement/DeviceManagement_EditDialog.tsx` | ✅ `DeviceManagement.tsx` |
| ✅ `RemoteController.tsx` | ✅ `devicemanagement/DeviceManagement_RemoteController.tsx` | ✅ `index.ts` |
| ✅ `device-wizard/BasicInfoStep.tsx` | ✅ `devicemanagement/wizard/DeviceManagement_BasicInfoStep.tsx` | ✅ Internal dialogs |
| ✅ `device-wizard/ModelSelectionStep.tsx` | ✅ `devicemanagement/wizard/DeviceManagement_ModelSelectionStep.tsx` | ✅ Internal dialogs |
| ✅ `device-wizard/ControllerConfigurationStep.tsx` | ✅ `devicemanagement/wizard/DeviceManagement_ControllerConfigStep.tsx` | ✅ Internal dialogs |
| ✅ `device-wizard/ControllerTypeSection.tsx` | ✅ `devicemanagement/wizard/DeviceManagement_ControllerTypeSection.tsx` | ✅ Internal wizard |
| ✅ `device-wizard/DynamicControllerForm.tsx` | ✅ `devicemanagement/wizard/DeviceManagement_DynamicControllerForm.tsx` | ✅ Internal wizard |
| ✅ `device-wizard/ReviewStep.tsx` | ✅ `devicemanagement/wizard/DeviceManagement_ReviewStep.tsx` | ✅ Internal dialogs |

**Import Updates for Phase 4:**
```typescript
// automai/virtualpytest/src/web/pages/DeviceManagement.tsx
// OLD:
import CreateDeviceDialog from '../components/CreateDeviceDialog';
import EditDeviceDialog from '../components/EditDeviceDialog';

// NEW: ✅ COMPLETED
import CreateDeviceDialog from '../components/devicemanagement/DeviceManagement_CreateDialog';
import EditDeviceDialog from '../components/devicemanagement/DeviceManagement_EditDialog';

// components/index.ts
// OLD:
export { default as RemoteController } from './RemoteController';
export { default as CreateDeviceDialog } from './CreateDeviceDialog';

// NEW: ✅ COMPLETED
export { default as RemoteController } from './devicemanagement/DeviceManagement_RemoteController';
export { default as CreateDeviceDialog } from './devicemanagement/DeviceManagement_CreateDialog';

// Internal wizard imports in DeviceManagement_CreateDialog.tsx and DeviceManagement_EditDialog.tsx
// OLD:
import { BasicInfoStep } from './device-wizard/BasicInfoStep';
import { ModelSelectionStep } from './device-wizard/ModelSelectionStep';
import { ControllerConfigurationStep } from './device-wizard/ControllerConfigurationStep';
import { ReviewStep } from './device-wizard/ReviewStep';

// NEW: ✅ COMPLETED
import { BasicInfoStep } from './wizard/DeviceManagement_BasicInfoStep';
import { ModelSelectionStep } from './wizard/DeviceManagement_ModelSelectionStep';
import { ControllerConfigurationStep } from './wizard/DeviceManagement_ControllerConfigStep';
import { ReviewStep } from './wizard/DeviceManagement_ReviewStep';

// Internal wizard component imports
// OLD:
import { ControllerTypeSection } from './ControllerTypeSection';
import { DynamicControllerForm } from './DynamicControllerForm';

// NEW: ✅ COMPLETED
import { ControllerTypeSection } from './DeviceManagement_ControllerTypeSection';
import { DynamicControllerForm } from './DeviceManagement_DynamicControllerForm';
```

**Phase 4 Verification Completed:**
- ✅ **Files moved successfully**: All 9 device management components moved and renamed with DeviceManagement_ prefix
- ✅ **Import updates applied**: DeviceManagement.tsx and components/index.ts imports updated to new paths
- ✅ **Internal imports fixed**: All wizard component internal imports updated to new file names
- ✅ **No old import references**: Grep search confirms no remaining old imports
- ✅ **Index.ts created**: Clean exports available for devicemanagement and wizard components
- ✅ **Old directory removed**: Empty device-wizard directory cleaned up

### Phase 5: Models Components
**Status**: ⏳ Pending

| Current File | New File | Import Updates Required |
|-------------|----------|-------------------------|
| `model/CreateModelDialog.tsx` | `models/Models_CreateDialog.tsx` | `Models.tsx` |

**Import Updates for Phase 5:**
```typescript
// automai/virtualpytest/src/web/pages/Models.tsx
// OLD:
import { CreateModelDialog } from '../components/model/CreateModelDialog';

// NEW:
import { Models_CreateDialog } from '../components/models/Models_CreateDialog';
```

### Phase 6: Controller Components
**Status**: ⏳ Pending

| Current File | New File | Import Updates Required |
|-------------|----------|-------------------------|
| `remote/RemotePanel.tsx` | `controller/remote/Controller_RemotePanel.tsx` | `NavigationEditor.tsx` |
| `remote/HDMIStreamPanel.tsx` | `controller/remote/Controller_HDMIStreamPanel.tsx` | Internal |
| `remote/AndroidMobileOverlay.tsx` | `controller/remote/Controller_AndroidMobileOverlay.tsx` | Internal |
| `remote/AndroidMobileCore.tsx` | `controller/remote/Controller_AndroidMobileCore.tsx` | Internal |
| `remote/RemoteCore.tsx` | `controller/remote/Controller_RemoteCore.tsx` | Internal |
| `remote/CompactAndroidMobile.tsx` | `controller/remote/Controller_CompactAndroidMobile.tsx` | `NavigationEditor.tsx` |
| `remote/CompactRemote.tsx` | `controller/remote/Controller_CompactRemote.tsx` | `NavigationEditor.tsx` |
| `remote/RemoteInterface.tsx` | `controller/remote/Controller_RemoteInterface.tsx` | Internal |
| `remote/ControllerImplementations.tsx` | `controller/remote/Controller_ControllerImplementations.tsx` | `Controller.tsx` |
| `remote/ControllerTypesOverview.tsx` | `controller/remote/Controller_ControllerTypesOverview.tsx` | `Controller.tsx` |
| `power/USBPowerPanel.tsx` | `controller/power/Controller_USBPowerPanel.tsx` | Internal |
| `modals/remote/HDMIStreamModal.tsx` | `controller/modals/Controller_HDMIStreamModal.tsx` | Internal |
| `modals/remote/RemoteModal.tsx` | `controller/modals/Controller_RemoteModal.tsx` | Internal |
| `modals/remote/AndroidMobileModal.tsx` | `controller/modals/Controller_AndroidMobileModal.tsx` | Internal |

**Import Updates for Phase 6:**
```typescript
// automai/virtualpytest/src/web/pages/NavigationEditor.tsx
// OLD:
import { CompactRemote } from '../components/remote/CompactRemote';
import { CompactAndroidMobile } from '../components/remote/CompactAndroidMobile';
import { RemotePanel } from '../components/remote/RemotePanel';

// NEW:
import { Controller_CompactRemote } from '../components/controller/remote/Controller_CompactRemote';
import { Controller_CompactAndroidMobile } from '../components/controller/remote/Controller_CompactAndroidMobile';
import { Controller_RemotePanel } from '../components/controller/remote/Controller_RemotePanel';

// automai/virtualpytest/src/web/pages/Controller.tsx
// OLD:
import { ControllerTypesOverview, ControllerImplementations } from '../components/remote';

// NEW:
import { Controller_ControllerTypesOverview, Controller_ControllerImplementations } from '../components/controller/remote';

// components/controller/remote/Controller_ControllerImplementations.tsx
// OLD:
import { RemoteModal } from '../modals/remote/RemoteModal';
import { AndroidMobileModal } from '../modals/remote/AndroidMobileModal';
import { HDMIStreamModal } from '../modals/remote/HDMIStreamModal';
import { USBPowerPanel } from '../power/USBPowerPanel';

// NEW:
import { Controller_RemoteModal } from '../modals/Controller_RemoteModal';
import { Controller_AndroidMobileModal } from '../modals/Controller_AndroidMobileModal';
import { Controller_HDMIStreamModal } from '../modals/Controller_HDMIStreamModal';
import { Controller_USBPowerPanel } from '../power/Controller_USBPowerPanel';

// components/controller/remote/Controller_HDMIStreamPanel.tsx
// OLD:
import { StreamViewer } from '../user-interface/StreamViewer';

// NEW:
import { UserInterface_StreamViewer } from '../../userinterface/UserInterface_StreamViewer';

// components/controller/modals/Controller_AndroidMobileModal.tsx
// OLD:
import { AndroidMobileCore } from '../../remote/AndroidMobileCore';
import { AndroidMobileOverlay } from '../../remote/AndroidMobileOverlay';

// NEW:
import { Controller_AndroidMobileCore } from '../remote/Controller_AndroidMobileCore';
import { Controller_AndroidMobileOverlay } from '../remote/Controller_AndroidMobileOverlay';

// components/controller/modals/Controller_HDMIStreamModal.tsx
// OLD:
import { HDMIStreamPanel } from '../../remote/HDMIStreamPanel';

// NEW:
import { Controller_HDMIStreamPanel } from '../remote/Controller_HDMIStreamPanel';

// components/controller/modals/Controller_RemoteModal.tsx
// OLD:
import { RemotePanel } from '../../remote/RemotePanel';

// NEW:
import { Controller_RemotePanel } from '../remote/Controller_RemotePanel';
```

### Phase 7: Validation & Verification Components
**Status**: ⏳ Pending

| Current File | New File | Import Updates Required |
|-------------|----------|-------------------------|
| `validation/ValidationPreviewClient.tsx` | `runtests/validation/RunTests_ValidationPreview.tsx` | Internal |
| `validation/ValidationEventListener.tsx` | `runtests/validation/RunTests_ValidationEventListener.tsx` | Internal |
| `validation/ValidationResultsClient.tsx` | `runtests/validation/RunTests_ValidationResults.tsx` | Internal |
| `validation/ValidationAnimationsProvider.tsx` | `runtests/validation/RunTests_ValidationAnimationsProvider.tsx` | Internal |
| `validation/ValidationProgressClient.tsx` | `runtests/validation/RunTests_ValidationProgress.tsx` | Internal |
| `validation/ValidationButtonClient.tsx` | `runtests/validation/RunTests_ValidationButton.tsx` | Internal |
| `verification/VerificationTextComparisonDisplay.tsx` | `runtests/verification/RunTests_VerificationTextComparison.tsx` | Internal |
| `verification/TextComparisonDisplay.tsx` | `runtests/verification/RunTests_TextComparison.tsx` | Internal |
| `verification/ImageComparisonThumbnails.tsx` | `runtests/verification/RunTests_ImageComparisonThumbnails.tsx` | Internal |
| `verification/VerificationImageComparisonThumbnails.tsx` | `runtests/verification/RunTests_VerificationImageThumbnails.tsx` | Internal |
| `verification/VerificationItem.tsx` | `runtests/verification/RunTests_VerificationItem.tsx` | `Navigation_NodeVerificationsList.tsx` |
| `verification/VerificationImageComparisonDialog.tsx` | `runtests/verification/RunTests_VerificationImageDialog.tsx` | `Navigation_NodeVerificationsList.tsx` |
| `verification/VerificationTestResults.tsx` | `runtests/verification/RunTests_VerificationTestResults.tsx` | Internal |
| `verification/ImageComparisonModal.tsx` | `runtests/verification/RunTests_ImageComparisonModal.tsx` | Internal |
| `verification/VerificationControls.tsx` | `runtests/verification/RunTests_VerificationControls.tsx` | Internal |
| `verification/VerificationResultsDisplay.tsx` | `runtests/verification/RunTests_VerificationResultsDisplay.tsx` | `NavigationEditor.tsx` |

**Import Updates for Phase 7:**
```typescript
// automai/virtualpytest/src/web/pages/NavigationEditor.tsx
// OLD:
import { VerificationResultsDisplay } from '../components/verification/VerificationResultsDisplay';

// NEW:
import { RunTests_VerificationResultsDisplay } from '../components/runtests/verification/RunTests_VerificationResultsDisplay';

// components/navigation/Navigation_NodeVerificationsList.tsx
// OLD:
import { VerificationItem } from '../verification/VerificationItem';
import { VerificationImageComparisonDialog } from '../verification/VerificationImageComparisonDialog';

// NEW:
import { RunTests_VerificationItem } from '../runtests/verification/RunTests_VerificationItem';
import { RunTests_VerificationImageDialog } from '../runtests/verification/RunTests_VerificationImageDialog';

// components/userinterface/UserInterface_VerificationEditor.tsx
// OLD:
import { VerificationTextComparisonDisplay } from '../verification/VerificationTextComparisonDisplay';

// NEW:
import { RunTests_VerificationTextComparison } from '../runtests/verification/RunTests_VerificationTextComparison';
```

### Phase 8: Shared Components (Store)
**Status**: ⏳ Pending

| Current File | New File | Import Updates Required |
|-------------|----------|-------------------------|
| `store/validationStore.ts` | `shared/stores/validationStore.ts` | Multiple components |

**Import Updates for Phase 8:**
```typescript
// components/runtests/validation/RunTests_ValidationProgress.tsx
// OLD:
import { useValidationStore } from '../store/validationStore';

// NEW:
import { useValidationStore } from '../../shared/stores/validationStore';

// components/runtests/validation/RunTests_ValidationResults.tsx
// OLD:
import { useValidationStore } from '../store/validationStore';

// NEW:
import { useValidationStore } from '../../shared/stores/validationStore';

// hooks/useValidationColors.ts
// OLD:
import { useValidationStore } from '../components/store/validationStore';

// NEW:
import { useValidationStore } from '../components/shared/stores/validationStore';

// components/hooks/useValidation.ts (IF IT MOVES TO /hooks/)
// OLD:
import { useValidationStore } from '../store/validationStore';

// NEW:
import { useValidationStore } from '../components/shared/stores/validationStore';
```

### Phase 9: Hook Movement (if needed)
**Status**: ⏳ Pending

| Current File | New File | Import Updates Required |
|-------------|----------|-------------------------|
| `components/hooks/useValidation.ts` | `hooks/useValidation.ts` | Multiple components |

**Import Updates for Phase 9:**
```typescript
// components/runtests/validation/RunTests_ValidationButton.tsx
// OLD:
import { useValidation } from '../hooks/useValidation';

// NEW:
import { useValidation } from '../../../hooks/useValidation';

// components/runtests/validation/RunTests_ValidationPreview.tsx
// OLD:
import { useValidation } from '../hooks/useValidation';

// NEW:
import { useValidation } from '../../../hooks/useValidation';

// components/runtests/validation/RunTests_ValidationProgress.tsx
// OLD:
import { useValidation } from '../hooks/useValidation';

// NEW:
import { useValidation } from '../../../hooks/useValidation';

// components/runtests/validation/RunTests_ValidationResults.tsx
// OLD:
import { useValidation } from '../hooks/useValidation';

// NEW:
import { useValidation } from '../../../hooks/useValidation';
```

---

## 🔍 VERIFICATION CHECKLIST

After each phase, verify:

### ✅ Import Verification Steps
1. **Search for old imports**: `grep -r "from.*old_path" src/`
2. **Check TypeScript compilation**: `npm run build` or `tsc --noEmit`
3. **Test component imports**: Check that components still render
4. **Verify index.ts exports**: Update index files for clean exports

### ✅ File Verification Steps  
1. **Confirm old files are deleted**: Check that source files are removed
2. **Confirm new files exist**: Check that target files are created
3. **Check file contents**: Ensure file contents are unchanged except for imports

### ✅ Runtime Verification Steps
1. **Development server**: Check that `npm run dev` works
2. **Page loads**: Test that all pages load without errors
3. **Component functionality**: Test key component interactions

---

## 🚨 CRITICAL IMPORT DEPENDENCIES

### High-Risk Imports (Many dependencies)
- `useValidationStore` → Used in 2 components + hooks
- `VerificationItem` → Used in Navigation components  
- `ValidationColors hooks` → Used across many components
- `Remote components` → Cross-referenced between controller and navigation

### Index.ts Files to Update
```typescript
// components/index.ts - MAIN INDEX
export * from './common';
export * from './navigation';
export * from './userinterface';
export * from './devicemanagement';
export * from './models';
export * from './controller';
export * from './runtests';
export * from './shared';

// components/navigation/index.ts
export { Navigation_Bar } from './Navigation_Bar';
export { Navigation_MenuNode } from './Navigation_MenuNode';
export { Navigation_NavigationNode } from './Navigation_NavigationNode';
export { Navigation_NavigationEdge } from './Navigation_NavigationEdge';
// ... etc

// components/runtests/verification/index.ts  
export { RunTests_VerificationItem } from './RunTests_VerificationItem';
export { RunTests_VerificationImageDialog } from './RunTests_VerificationImageDialog';
// ... etc

// components/shared/stores/index.ts
export { useValidationStore } from './validationStore';
```

---

## 📋 EXECUTION PHASES

### Pre-Migration
- [ ] Create backup of current state
- [ ] Create new directory structure  
- [ ] Set up index.ts files

### Migration Execution
- [ ] Phase 1: Common Components
- [ ] Phase 2: Navigation Components
- [ ] Phase 3: User Interface Components  
- [ ] Phase 4: Device Management Components
- [ ] Phase 5: Models Components
- [ ] Phase 6: Controller Components
- [ ] Phase 7: Validation & Verification Components
- [ ] Phase 8: Shared Components (Store)
- [ ] Phase 9: Hook Movement (if needed)

### Post-Migration
- [ ] Remove empty directories
- [ ] Update main index.ts exports
- [ ] Run full test suite
- [ ] Verify all pages load correctly
- [ ] Update documentation

---

## 🔧 MIGRATION COMMANDS

```bash
# Phase preparation
mkdir -p components/{common,dashboard,navigation,userinterface,devicemanagement/wizard,models,testcaseeditor,campaigneditor,controller/{remote,power,modals},environment,runtests/{validation,verification},testreports,library,monitoring,collections,shared/stores}

# Example migration command for a file:
git mv components/navigation/UIMenuNode.tsx components/navigation/Navigation_MenuNode.tsx

# Search and replace imports:
find src/ -name "*.tsx" -exec sed -i 's|from.*UIMenuNode|from.*Navigation_MenuNode|g' {} \;

# Verify no broken imports:
grep -r "UIMenuNode" src/ --include="*.tsx"
```

This migration plan ensures we systematically track every file move and import update to prevent breaking the codebase during reorganization. 