# onConnect Functionality Restoration Plan

## Problem Analysis

### Current State

- **File**: `virtualpytest/src/web/hooks/navigation/useNavigationEditor.ts`
- **Issue**: `onConnect` function is a placeholder that only logs connections
- **Regression Date**: June 28, 2025, commit `9539a226c` ("clean")
- **Root Cause**: Working implementation was in deleted `useNavigationNodesHook.ts`

### Current Implementation (Lines 65-68)

```typescript
const onConnect = useCallback((connection: any) => {
  console.log('Connection attempt:', connection);
  // TODO: Implement connection logic
}, []);
```

### Expected Behavior

- User drags from node handle to another node handle
- Visual edge appears connecting the nodes
- Edge is saved to database automatically
- Edge can be selected and edited

## Technical Analysis

### Current Infrastructure Available

1. **NavigationContext** provides:

   - `setEdges()` - ReactFlow's useEdgesState setter
   - `markUnsavedChanges()` - marks tree as modified
   - `setError()` - error reporting
   - `nodes` and `edges` arrays

2. **ReactFlow Integration**:

   - Uses `useEdgesState` for edge management
   - `addEdge` utility available from reactflow
   - `Connection` type for connection parameters

3. **Auto-save Pattern**:
   - `saveToConfig()` function accepts `overrideState` with edges
   - Same pattern used in `handleEdgeFormSubmit`

### Data Structures

```typescript
// UINavigationEdge structure
interface UINavigationEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type: 'uiNavigation';
  data: {
    description: string;
    from: string;
    to: string;
    actions: EdgeAction[];
    retryActions: EdgeAction[];
    finalWaitTime: number;
    edgeType: 'horizontal' | 'vertical';
  };
}
```

## Implementation Plan

### Step 1: Add Required Imports

**File**: `virtualpytest/src/web/hooks/navigation/useNavigationEditor.ts`
**Line**: 2

**Current**:

```typescript
import { MarkerType } from 'reactflow';
```

**Update to**:

```typescript
import { MarkerType, addEdge, Connection } from 'reactflow';
```

### Step 2: Replace onConnect Implementation

**File**: `virtualpytest/src/web/hooks/navigation/useNavigationEditor.ts`
**Lines**: 65-68

**Replace entire function with**:

```typescript
const onConnect = useCallback(
  async (connection: Connection) => {
    console.log('Connection attempt:', connection);

    // Validate connection parameters
    if (!connection.source || !connection.target) {
      console.error(
        '[@useNavigationEditor:onConnect] Invalid connection: missing source or target',
      );
      return;
    }

    // Find source and target nodes
    const sourceNode = navigation.nodes.find((n) => n.id === connection.source);
    const targetNode = navigation.nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) {
      console.error('[@useNavigationEditor:onConnect] Source or target node not found');
      return;
    }

    // Prevent self-connections
    if (connection.source === connection.target) {
      console.error('[@useNavigationEditor:onConnect] Cannot connect node to itself');
      navigation.setError('Cannot connect node to itself');
      return;
    }

    // Create new edge with proper UINavigationEdge structure
    const newEdge = {
      id: `${connection.source}-${connection.target}`,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'uiNavigation',
      data: {
        description: `Connection from ${sourceNode.data.label} to ${targetNode.data.label}`,
        from: sourceNode.data.label,
        to: targetNode.data.label,
        actions: [],
        retryActions: [],
        finalWaitTime: 2000,
        edgeType: 'horizontal' as const,
      },
    };

    // Add edge to state using ReactFlow's addEdge helper
    const updatedEdges = addEdge(newEdge, navigation.edges);
    navigation.setEdges(updatedEdges);
    navigation.markUnsavedChanges();

    console.log('[@useNavigationEditor:onConnect] Edge created successfully:', newEdge.id);

    // Auto-save after edge creation (following same pattern as handleEdgeFormSubmit)
    if (navigation.userInterface?.id) {
      console.log(
        '[@useNavigationEditor:onConnect] Auto-saving navigation tree after edge creation',
      );

      try {
        await saveToConfig(navigation.userInterface.id, { edges: updatedEdges });
        console.log('[@useNavigationEditor:onConnect] Tree saved successfully');
      } catch (saveError) {
        console.error('[@useNavigationEditor:onConnect] Failed to auto-save tree:', saveError);
        navigation.setError(
          'Edge created but failed to save navigation tree. Please save manually.',
        );
      }
    }
  },
  [navigation, saveToConfig],
);
```

### Step 3: Verify Dependencies

**File**: `virtualpytest/src/web/hooks/navigation/useNavigationEditor.ts`
**Lines**: 693-717

**Current dependency array already includes**:

- `onConnect` ✓
- `saveToConfig` ✓

No changes needed.

## Implementation Details

### Edge Creation Logic

1. **Validation**: Check source/target exist and are different
2. **Node Lookup**: Find actual node objects from IDs
3. **Edge Construction**: Create proper UINavigationEdge object
4. **State Update**: Use ReactFlow's `addEdge` helper
5. **Auto-save**: Follow existing pattern from form submissions

### Error Handling

- Invalid connections show user-friendly error messages
- Auto-save failures are logged but don't block edge creation
- All errors use existing `navigation.setError()` mechanism

### Auto-save Integration

- Uses same `saveToConfig()` pattern as `handleEdgeFormSubmit`
- Passes `overrideState` with updated edges array
- Maintains consistency with existing save behavior

## Testing Strategy

### Manual Testing Steps

1. **Basic Connection**: Drag from node A to node B

   - Expected: Visual edge appears
   - Expected: Console shows "Edge created successfully"

2. **Self-Connection**: Try to connect node to itself

   - Expected: Error message displayed
   - Expected: No edge created

3. **Auto-save Verification**: Check database after connection

   - Expected: New edge persisted in navigation tree

4. **Edge Editing**: Click on created edge
   - Expected: Edge selection panel opens
   - Expected: Can edit edge properties

### Validation Points

- [ ] Edge appears visually after connection
- [ ] Edge has correct source/target IDs
- [ ] Edge data structure matches UINavigationEdge
- [ ] Auto-save completes successfully
- [ ] Edge can be selected and edited
- [ ] Error handling works for invalid connections

## Rollback Strategy

If implementation fails:

1. **Immediate Rollback**: Restore original 4-line placeholder
2. **Partial Rollback**: Remove auto-save, keep basic edge creation
3. **Debug Mode**: Add extensive logging to identify issues

## Original Working Implementation Reference

From deleted `useNavigationNodesHook.ts`:

- Used `typedValidateConnection` for validation
- Applied node updates based on connection rules
- Used `addEdge` helper from ReactFlow
- Had comprehensive error handling

## Success Criteria

✅ **Primary Goal**: User can drag between nodes to create edges
✅ **Secondary Goal**: Edges are automatically saved
✅ **Tertiary Goal**: Error handling prevents invalid connections

## File Changes Summary

- **1 file modified**: `virtualpytest/src/web/hooks/navigation/useNavigationEditor.ts`
- **Import changes**: Add `addEdge, Connection` from reactflow
- **Function replacement**: Replace 4-line placeholder with 60-line implementation
- **No new files created**
- **No other files modified**

This plan restores the exact functionality that was lost during the June 28, 2025 refactoring while maintaining compatibility with the current unified navigation context architecture.
