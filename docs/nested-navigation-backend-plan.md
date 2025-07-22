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

## Usage Examples

### Creating a Sub-Tree

```python
# Example: Create sub-tree for "Live TV" node actions
from src.lib.supabase.navigation_trees_db import create_sub_tree

# Sub-tree for channel operations
sub_tree_data = {
    "nodes": [
        {
            "id": "live-entry",
            "data": {"type": "entry", "label": "LIVE_ENTRY"}
        },
        {
            "id": "channel-up",
            "data": {"type": "screen", "label": "Channel Up", "action_type": "in_context"}
        },
        {
            "id": "channel-down",
            "data": {"type": "screen", "label": "Channel Down", "action_type": "in_context"}
        },
        {
            "id": "info-bar",
            "data": {"type": "overlay", "label": "Info Bar", "action_type": "in_context"}
        }
    ],
    "edges": [
        {"id": "e1", "source": "live-entry", "target": "channel-up"},
        {"id": "e2", "source": "live-entry", "target": "channel-down"},
        {"id": "e3", "source": "live-entry", "target": "info-bar"}
    ]
}

success, message, created_tree = create_sub_tree(
    parent_tree_id="main-tree-id",
    parent_node_id="live-tv-node",
    sub_tree_name="live_tv_actions",
    tree_data=sub_tree_data,
    team_id="team-123",
    description="Channel and info actions for Live TV"
)
```

### Loading Sub-Trees On-Demand

```python
# Frontend workflow for loading sub-trees
from src.lib.supabase.navigation_trees_db import get_node_sub_trees

# 1. User double-clicks "Live TV" node
# 2. Check if node has sub-trees
success, message, sub_trees = get_node_sub_trees("main-tree-id", "live-tv-node", "team-123")

if sub_trees:
    # 3. Load the first sub-tree for detailed view
    main_sub_tree = sub_trees[0]
    # 4. Display new ReactFlow graph with sub-tree content
```

### Breadcrumb Navigation

```python
from src.lib.supabase.navigation_trees_db import get_tree_breadcrumb

# Get navigation path for current tree
success, message, breadcrumb = get_tree_breadcrumb("sub-tree-id", "team-123")

# Result: [
#   {"tree_id": "root-id", "tree_name": "Main Navigation", "parent_node_id": null},
#   {"tree_id": "sub-tree-id", "tree_name": "Live TV Actions", "parent_node_id": "live-tv-node", "is_current": true}
# ]
```

## Frontend Integration Plan

### Phase 1: Core Infrastructure

- [ ] Enhance NavigationEditor to support nested tree creation
- [ ] Add breadcrumb navigation component
- [ ] Implement drill-down UI (double-click to enter sub-tree)
- [ ] Add visual indicators for nodes with sub-trees

### Phase 2: User Experience

- [ ] Sub-tree loading with caching
- [ ] Navigation stack management
- [ ] Back/forward navigation between tree levels
- [ ] Context-aware action execution

### Phase 3: Advanced Features

- [ ] Bulk sub-tree operations
- [ ] Sub-tree templates and cloning
- [ ] Cross-tree navigation references
- [ ] Performance optimizations

## Benefits of This Architecture

1. **Scalability**: Each sub-tree is a separate database record, allowing efficient loading
2. **Maintainability**: Clear separation between main navigation and detailed actions
3. **Performance**: On-demand loading reduces initial tree complexity
4. **Flexibility**: Support for multiple sub-trees per node
5. **History**: Full version control for all tree levels
6. **Breadcrumbs**: Clear navigation context for users

## Migration Strategy

1. **Backward Compatibility**: All existing trees continue to work as-is
2. **Gradual Enhancement**: Teams can add nested navigation incrementally
3. **Data Integrity**: Existing tree_level and hierarchy fields already in place
4. **No Breaking Changes**: New fields are optional and have sensible defaults

## Testing Strategy

1. **Unit Tests**: Database functions with various hierarchy scenarios
2. **Integration Tests**: API endpoints with nested tree operations
3. **Performance Tests**: Loading trees with deep nesting levels
4. **UI Tests**: Frontend navigation and breadcrumb functionality

This backend implementation provides a solid foundation for the hierarchical navigation system while maintaining compatibility with existing trees and workflows.
