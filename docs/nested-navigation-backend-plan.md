# Nested Navigation Trees - Backend Implementation Plan

## Overview

This document outlines the complete backend implementation plan for nested navigation trees. The system allows modeling hierarchical navigation where nodes can contain sub-trees for detailed in-context actions.

## Database Schema Enhancements ✅ COMPLETED

### Enhanced `navigation_trees` Table

The table now supports hierarchical structure with these key fields:

```sql
-- Existing hierarchical fields (already present)
parent_tree_id UUID REFERENCES navigation_trees(id)  -- Parent tree reference
tree_level INTEGER DEFAULT 0                         -- Depth in hierarchy
is_root BOOLEAN DEFAULT true                         -- Root tree marker
root_tree_id UUID REFERENCES navigation_trees(id)    -- Reference to root
tree_path TEXT[] DEFAULT '{}'                        -- Breadcrumb path

-- New field added
parent_node_id TEXT                                   -- Node that opened this sub-tree

-- Indexes for performance
CREATE INDEX idx_navigation_trees_parent_node ON navigation_trees(parent_tree_id, parent_node_id);
CREATE INDEX idx_navigation_trees_hierarchy ON navigation_trees(root_tree_id, tree_level);
```

### Node Metadata Structure

Nodes in the metadata JSON now support:

```json
{
  "id": "node-123",
  "data": {
    "type": "screen|menu|dialog|popup|overlay",
    "label": "Live TV",
    "has_sub_tree": true, // NEW: Indicates sub-tree exists
    "sub_tree_count": 3, // NEW: Number of sub-trees
    "action_type": "navigation|in_context", // NEW: Type of actions
    "context_parent": "parent-node-id" // NEW: For action nodes
  }
}
```

## Database Functions ✅ COMPLETED

### Core Hierarchical Functions

1. **`get_sub_trees(parent_tree_id, parent_node_id?, team_id?)`**

   - Retrieves all sub-trees for a parent tree
   - Optionally filters by specific parent node
   - Returns ordered by tree_level and creation date

2. **`create_sub_tree(parent_tree_id, parent_node_id, name, tree_data, ...)`**

   - Creates new sub-tree with proper hierarchy setup
   - Automatically calculates tree_level, root_tree_id, tree_path
   - Creates history record for the new tree
   - Updates parent node metadata

3. **`get_tree_breadcrumb(tree_id, team_id?)`**

   - Returns breadcrumb navigation path from root to current tree
   - Includes tree names and parent node references
   - Used for navigation UI components

4. **`get_node_sub_trees(tree_id, node_id, team_id?)`**

   - Gets all sub-trees belonging to a specific node
   - Returns summary information for quick loading

5. **`update_node_sub_tree_reference(tree_id, node_id, has_sub_tree, ...)`**
   - Updates node metadata to indicate sub-tree presence
   - Maintains consistency between trees and nodes

## API Endpoints ✅ COMPLETED

### Nested Navigation Endpoints

All endpoints follow the pattern `/server/navigationTrees/...`:

```typescript
// Get sub-trees for a parent tree
GET /navigationTrees/getSubTrees/<parent_tree_id>
Query params: team_id?, parent_node_id?
Response: { success: boolean, sub_trees: Tree[], count: number }

// Create new sub-tree
POST /navigationTrees/createSubTree
Body: {
  parent_tree_id: string,
  parent_node_id: string,
  sub_tree_name: string,
  tree_data: object,
  description?: string
}
Response: { success: boolean, message: string, sub_tree: Tree }

// Get breadcrumb path
GET /navigationTrees/getBreadcrumb/<tree_id>
Response: { success: boolean, breadcrumb: BreadcrumbItem[], count: number }

// Get sub-trees for specific node
GET /navigationTrees/getNodeSubTrees/<tree_id>/<node_id>
Response: { success: boolean, node_id: string, sub_trees: Tree[], count: number }

// Update node sub-tree reference
POST /navigationTrees/updateNodeSubTreeReference
Body: { tree_id: string, node_id: string, has_sub_tree: boolean }
Response: { success: boolean, message: string }
```

---

# Frontend Implementation Plan

## Use Cases & Workflows

### Use Case 1: Node Without Actions (First Time)

**Scenario**: User double-clicks a "Live TV" node that has no sub-trees yet.

**Workflow**:

1. **Double-click Detection**: `onNodeDoubleClick` handler detects non-entry node
2. **Sub-tree Check**: Check if node has existing sub-trees via API call
3. **Create Empty Sub-tree**:
   - Create new sub-tree with single entry node
   - Set `parent_tree_id` and `parent_node_id` references
   - **Don't save to DB yet** - keep in local state
4. **Navigation**:
   - Push current tree to navigation stack
   - Load empty sub-tree in editor
   - Show breadcrumb: "Main > Live TV"
5. **Edit Mode**: User can add nodes and edges within the sub-tree
6. **Save Trigger**: Only save to DB when user clicks "Save" button

### Use Case 2: Node With Existing Actions

**Scenario**: User double-clicks "Live TV" node that already has sub-trees.

**Workflow**:

1. **Double-click Detection**: Handler detects node with `has_sub_tree: true`
2. **Load Sub-trees**: Fetch existing sub-trees for this node
3. **Cache Check**: Check if sub-trees are already cached
4. **Load Primary Sub-tree**: Display the first/primary sub-tree
5. **Navigation**: Update breadcrumb and navigation stack
6. **Multiple Sub-trees**: If multiple exist, show selector UI

### Use Case 3: Empty Sub-tree Deletion

**Scenario**: User deletes all nodes inside a sub-tree.

**Decision**: **Keep the empty sub-tree** for these reasons:

- User might want to add nodes later
- Preserves navigation structure and breadcrumbs
- Avoids accidental data loss
- Consistent with main tree behavior (empty trees are valid)

**Workflow**:

1. **Node Deletion**: User deletes last node in sub-tree
2. **Empty State**: Show empty state message: "This sub-tree is empty. Add nodes to define actions."
3. **Save Behavior**: Empty sub-tree is saved to DB (consistent with empty main trees)
4. **Manual Cleanup**: Provide explicit "Delete Sub-tree" action if user wants to remove entirely

## Detailed Component Architecture

### 1. Core Context Enhancements

#### **NavigationStack Context** (New)

```typescript
interface NavigationStackContextType {
  // Stack management
  navigationStack: TreeLevel[];
  currentLevel: number;

  // Stack operations
  pushLevel: (treeId: string, nodeId: string, treeName: string) => void;
  popLevel: () => void;
  navigateToLevel: (level: number) => void;

  // Breadcrumb data
  getBreadcrumb: () => BreadcrumbItem[];

  // Cache management
  getCachedTree: (treeId: string) => CachedTree | null;
  setCachedTree: (treeId: string, data: CachedTree) => void;
}

interface TreeLevel {
  treeId: string;
  treeName: string;
  parentNodeId: string | null;
  parentNodeLabel: string;
  hasUnsavedChanges: boolean;
}
```

#### **Enhanced NavigationContext**

```typescript
// Add to existing NavigationContextType
interface NavigationContextType {
  // ... existing fields ...

  // Nested navigation fields
  isNestedView: boolean;
  setIsNestedView: (nested: boolean) => void;
  parentTreeId: string | null;
  setParentTreeId: (id: string | null) => void;
  parentNodeId: string | null;
  setParentNodeId: (id: string | null) => void;
}
```

### 2. Enhanced Components

#### **NavigationEditor Enhancements**

- **File**: `virtualpytest/src/web/pages/NavigationEditor.tsx`
- **Changes**:
  - Wrap with `NavigationStackProvider`
  - Enhance `onNodeDoubleClick` handler for nested navigation
  - Add breadcrumb navigation bar
  - Handle nested tree loading and saving

#### **NavigationBreadcrumb Component** (New)

- **File**: `virtualpytest/src/web/components/navigation/NavigationBreadcrumb.tsx`
- **Purpose**: Display hierarchical navigation path
- **Features**:
  - Clickable breadcrumb items to navigate back
  - Visual indicators for unsaved changes at each level
  - Overflow handling for deep nesting

#### **Enhanced NavigationEditorHeader**

- **File**: `virtualpytest/src/web/components/navigation/Navigation_EditorHeader.tsx`
- **Changes**:
  - Add breadcrumb navigation
  - Show nested tree indicators
  - Handle save/discard for nested trees

#### **SubTreeCache Hook** (New)

- **File**: `virtualpytest/src/web/hooks/navigation/useSubTreeCache.ts`
- **Purpose**: LRU cache for sub-trees
- **Features**:
  - Cache recently accessed sub-trees
  - Automatic eviction of old entries
  - Dirty state tracking for unsaved changes

### 3. Visual Indicators & Styling

#### **Node Visual Enhancements**

- **Files**:
  - `virtualpytest/src/web/components/navigation/Navigation_NavigationNode.tsx`
  - `virtualpytest/src/web/components/navigation/Navigation_MenuNode.tsx`
- **Changes**:
  - Add visual indicator for nodes with sub-trees (small tree icon)
  - Different styling for nested vs main tree nodes
  - Hover effects showing "Double-click to explore"

#### **New CSS Classes**

```css
/* Nested navigation indicators */
.node-has-subtree {
  border-left: 3px solid #2196f3;
}

.node-nested-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: #2196f3;
  border-radius: 50%;
}

/* Breadcrumb styling */
.navigation-breadcrumb {
  background: #f5f5f5;
  border-bottom: 1px solid #ddd;
  padding: 8px 16px;
}

.breadcrumb-item {
  color: #666;
  text-decoration: none;
}

.breadcrumb-item:hover {
  color: #2196f3;
  text-decoration: underline;
}

.breadcrumb-current {
  color: #333;
  font-weight: 500;
}
```

## Implementation Phases

### Phase 1: Core Infrastructure ⏳ IN PROGRESS

- [x] Database schema enhancements
- [x] Backend API endpoints
- [ ] NavigationStack context
- [ ] Enhanced double-click handler
- [ ] Basic breadcrumb navigation

### Phase 2: Sub-tree Management

- [ ] Sub-tree cache implementation
- [ ] Empty sub-tree creation workflow
- [ ] Sub-tree loading and saving
- [ ] Visual indicators for nested nodes

### Phase 3: User Experience

- [ ] Breadcrumb navigation component
- [ ] Nested tree creation UI
- [ ] Multiple sub-tree management
- [ ] Unsaved changes tracking across levels

### Phase 4: Advanced Features

- [ ] Sub-tree templates and cloning
- [ ] Cross-tree navigation references
- [ ] Performance optimizations
- [ ] Bulk operations for nested trees

## Files to Modify

### Context Files

1. **`src/contexts/navigation/NavigationStackProvider.tsx`** (New)

   - Navigation stack management
   - Tree level caching
   - Breadcrumb generation

2. **`src/contexts/navigation/NavigationContext.tsx`** (Enhance)
   - Add nested navigation state
   - Parent tree tracking

### Component Files

3. **`src/pages/NavigationEditor.tsx`** (Enhance)

   - Wrap with NavigationStackProvider
   - Enhanced double-click handler
   - Breadcrumb integration

4. **`src/components/navigation/NavigationBreadcrumb.tsx`** (New)

   - Breadcrumb display and navigation
   - Level switching functionality

5. **`src/components/navigation/Navigation_EditorHeader.tsx`** (Enhance)

   - Breadcrumb integration
   - Nested tree save/discard

6. **`src/components/navigation/Navigation_NavigationNode.tsx`** (Enhance)

   - Visual indicators for sub-trees
   - Enhanced double-click handling

7. **`src/components/navigation/Navigation_MenuNode.tsx`** (Enhance)
   - Sub-tree indicators
   - Nested navigation support

### Hook Files

8. **`src/hooks/navigation/useSubTreeCache.ts`** (New)

   - LRU cache for sub-trees
   - Cache invalidation

9. **`src/hooks/navigation/useNavigationEditor.ts`** (Enhance)

   - Nested tree operations
   - Stack-aware save/load

10. **`src/hooks/navigation/useNestedNavigation.ts`** (New)
    - Nested navigation logic
    - Sub-tree management

### Type Files

11. **`src/types/pages/Navigation_Types.ts`** (Enhance)
    - Nested navigation types
    - Stack management types

## Workflow Summary

### Double-click Handler Flow

```typescript
const handleNodeDoubleClick = async (node: UINavigationNode) => {
  // 1. Check if node is entry type (skip)
  if (node.data.type === 'entry') return;

  // 2. Check for existing sub-trees
  const subTrees = await getNodeSubTrees(currentTreeId, node.id);

  if (subTrees.length > 0) {
    // 3a. Load existing sub-tree
    const primarySubTree = subTrees[0];
    await loadSubTree(primarySubTree.id);
    pushNavigationLevel(primarySubTree.id, node.id, primarySubTree.name);
  } else {
    // 3b. Create empty sub-tree (in memory only)
    const emptySubTree = createEmptySubTree(node);
    setCurrentSubTree(emptySubTree);
    pushNavigationLevel(emptySubTree.id, node.id, `${node.data.label} Actions`);
  }

  // 4. Update UI state
  setIsNestedView(true);
  updateBreadcrumb();
};
```

### Save Handler Flow

```typescript
const handleSave = async () => {
  const currentLevel = navigationStack.getCurrentLevel();

  if (currentLevel.isNested) {
    // Save nested tree
    await saveSubTree(currentLevel.treeId, {
      parent_tree_id: currentLevel.parentTreeId,
      parent_node_id: currentLevel.parentNodeId,
      tree_data: { nodes, edges },
    });

    // Update parent node metadata
    await updateNodeSubTreeReference(currentLevel.parentTreeId, currentLevel.parentNodeId, true);
  } else {
    // Save main tree (existing logic)
    await saveToConfig(userInterfaceId);
  }

  // Clear unsaved changes flag
  currentLevel.hasUnsavedChanges = false;
};
```

This comprehensive plan provides a clear roadmap for implementing nested navigation trees while maintaining backward compatibility and following the existing architectural patterns.
