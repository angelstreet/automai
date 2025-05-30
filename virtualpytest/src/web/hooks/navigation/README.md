# Navigation Editor Hooks

This directory contains modular hooks that together form the navigation editor functionality. The large `useNavigationEditor` hook has been refactored into smaller, focused hooks for better maintainability and organization.

## Architecture

The navigation editor follows a **modular hook pattern** where:

1. **Central Orchestrator**: `useNavigationEditor` - Main hook that imports and coordinates all other hooks
2. **Focused Modules**: Smaller hooks that handle specific concerns
3. **Same Interface**: The main hook maintains the exact same return interface, ensuring no breaking changes

## Hook Breakdown

### 🗄️ `useNavigationState`
**Purpose**: Manages all state variables for the navigation editor.

**Responsibilities**:
- Route parameters (treeId, treeName, interfaceId)
- Navigation state (breadcrumbs, paths)
- Save operation state (loading, errors, success)
- Interface state (userInterface, rootTree)
- React Flow state (nodes, edges)
- History state (undo/redo)
- View and UI state
- Filtering and progressive loading state

### 🔗 `useConnectionRules`
**Purpose**: Handles all connection validation and parent inheritance logic.

**Responsibilities**:
- Connection validation between nodes
- Parent-child relationship establishment
- Edge type determination
- Connection rules summary for debugging

**Key Functions**:
- `validateConnection()` - Validates and processes node connections
- `getRulesSummary()` - Returns documentation of connection rules

### 📚 `useNavigationHistory`
**Purpose**: Manages undo/redo functionality.

**Responsibilities**:
- Saving states to history
- Undo/redo operations
- History navigation
- State restoration

**Key Functions**:
- `saveToHistory()` - Saves current state
- `undo()` - Reverts to previous state
- `redo()` - Advances to next state

### 💾 `useNavigationCRUD`
**Purpose**: Handles all database operations.

**Responsibilities**:
- Loading trees from database
- Saving trees to database
- Creating empty tree structures
- Data conversion between formats

**Key Functions**:
- `loadFromDatabase()` - Loads tree data
- `saveToDatabase()` - Saves tree data
- `createEmptyTree()` - Creates initial tree structure

### 🎯 `useNodeEdgeManagement`
**Purpose**: Manages node and edge operations.

**Responsibilities**:
- Adding new nodes
- Editing node/edge properties
- Deleting nodes/edges
- Form handling for node/edge dialogs

**Key Functions**:
- `addNewNode()` - Creates new nodes
- `saveNodeChanges()` - Saves node edits
- `deleteSelected()` - Removes selected items

## Usage

### Standard Usage (Recommended)
```typescript
import { useNavigationEditor } from '@/hooks';

function NavigationEditor() {
  const navigation = useNavigationEditor();
  // Use all functionality as before - no changes needed!
}
```

### Direct Module Usage (Advanced)
```typescript
import { 
  useNavigationState, 
  useConnectionRules,
  useNavigationCRUD 
} from '@/hooks/navigation';

function CustomNavigationComponent() {
  const state = useNavigationState();
  const { validateConnection } = useConnectionRules();
  const { loadFromDatabase } = useNavigationCRUD(state);
  // Use specific hooks directly
}
```

## Benefits of This Refactoring

### ✅ **Maintainability**
- Each hook has a single, clear responsibility
- Easier to locate and fix bugs
- Simpler to add new features

### ✅ **Testability**
- Each hook can be tested independently
- Easier to mock dependencies
- More focused test cases

### ✅ **Reusability**
- Individual hooks can be used in other components
- Logic can be shared across different navigation contexts
- Easier to create variants of navigation editor

### ✅ **Performance**
- Better React optimization opportunities
- More granular dependency tracking
- Reduced unnecessary re-renders

### ✅ **Developer Experience**
- Easier to understand code structure
- Better IntelliSense and type support
- Clearer separation of concerns

## Connection Rules Overview

The connection rules are now centralized in `useConnectionRules` and include:

1. **Menu Node Connections**: Menu nodes establish parent-child relationships
2. **Screen-to-Screen**: Left/right handles for lateral navigation
3. **Top/Bottom Validation**: Require menu node involvement
4. **Default Fallback**: Allow connections without inheritance

## Migration Notes

**No Breaking Changes**: The main `useNavigationEditor` hook maintains the exact same interface, so existing components using it require no changes.

**Gradual Adoption**: You can start using individual hooks in new components while keeping existing code unchanged.

**Type Safety**: All hooks maintain full TypeScript support with proper interfaces. 