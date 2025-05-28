import React, { useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls, 
  ReactFlowProvider,
  MiniMap
} from 'reactflow';
import 'reactflow/dist/style.css';

// Import extracted components and hooks
import { useNavigationEditor } from '../hooks/useNavigationEditor';
import { UINavigationNode } from '../components/navigation/UINavigationNode';
import { UINavigationEdge } from '../components/navigation/UINavigationEdge';
import { NodeEditDialog } from '../components/navigation/NodeEditDialog';
import { EdgeEditDialog } from '../components/navigation/EdgeEditDialog';

// Define node types for ReactFlow
const nodeTypes = {
  uiScreen: UINavigationNode,
};

// Define edge types for ReactFlow
const edgeTypes = {
  smoothstep: UINavigationEdge,
};

const NavigationEditorContent: React.FC = () => {
  const {
    // State
    nodes,
    edges,
    treeName,
    isLoadingInterface,
    selectedNode,
    selectedEdge,
    isNodeDialogOpen,
    isEdgeDialogOpen,
    nodeForm,
    edgeForm,
    isLoading,
    error,
    success,
    reactFlowWrapper,
    reactFlowInstance,
    treeId,
    interfaceId,
    
    // Navigation state
    currentTreeId,
    currentTreeName,
    navigationPath,
    navigationNamePath,
    hasUnsavedChanges,
    isDiscardDialogOpen,
    userInterface,
    rootTree,
    
    // History state
    history,
    historyIndex,
    
    // Setters
    setIsNodeDialogOpen,
    setIsEdgeDialogOpen,
    setNodeForm,
    setEdgeForm,
    setReactFlowInstance,
    setIsDiscardDialogOpen,
    
    // Event handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onEdgeClick,
    onNodeDoubleClick,
    onPaneClick,
    
    // Actions
    loadFromDatabase,
    saveToDatabase,
    handleNodeFormSubmit,
    handleEdgeFormSubmit,
    handleDeleteNode,
    handleDeleteEdge,
    navigateToParent,
    addNewNode,
    cancelNodeChanges,
    discardChanges,
    performDiscardChanges,
    navigateToTreeLevel,
    goBackToParent,
    closeSelectionPanel,
    undo,
    redo,
    fitView,
    deleteSelected,
    
    // Configuration
    defaultEdgeOptions
  } = useNavigationEditor();
  
  // Show message if tree ID is missing
  useEffect(() => {
    if (!treeId && !interfaceId) {
      console.log('[@component:NavigationEditor] Missing tree ID in URL');
    }
  }, [treeId, interfaceId]);
  
  // Load tree data when component mounts or treeId changes
  useEffect(() => {
    if (currentTreeId && !isLoadingInterface) {
      loadFromDatabase();
    }
  }, [currentTreeId, isLoadingInterface, loadFromDatabase]);

    return (
    <div style={{ 
      width: '100vw', 
      height: 'calc(100vh - 100px)', // Fixed height calculation
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' // Prevent scrollbars
    }}>
      {/* Header with breadcrumb and controls */}
      <div style={{
        height: '60px',
        backgroundColor: 'var(--background, #ffffff)', // Dark theme support
        borderBottom: '1px solid var(--border, #e5e7eb)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        flexShrink: 0,
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}>
        {/* Left side - Breadcrumb navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={navigateToParent}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--secondary, #6b7280)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--secondary-hover, #4b5563)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--secondary, #6b7280)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ← Back to Trees
          </button>
          
          {/* Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {navigationNamePath.map((name, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span style={{ color: 'var(--muted-foreground, #6b7280)', fontSize: '14px' }}>→</span>}
                <button
                  onClick={() => navigateToTreeLevel(index)}
                  style={{
                    padding: '6px 12px',
                    backgroundColor: index === navigationNamePath.length - 1 ? 'var(--primary, #3b82f6)' : 'transparent',
                    color: index === navigationNamePath.length - 1 ? 'white' : 'var(--primary, #3b82f6)',
                    border: `1px solid var(--primary, #3b82f6)`,
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => {
                    if (index !== navigationNamePath.length - 1) {
                      e.currentTarget.style.backgroundColor = 'var(--primary-light, #dbeafe)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (index !== navigationNamePath.length - 1) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {name}
                </button>
              </React.Fragment>
            ))}
        </div>
          
          {hasUnsavedChanges && (
            <span style={{ 
              color: 'var(--destructive, #ef4444)', 
              fontSize: '13px', 
              fontWeight: '600',
              marginLeft: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <span style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                backgroundColor: 'var(--destructive, #ef4444)' 
              }}></span>
              Unsaved changes
            </span>
          )}
        </div>

        {/* Right side - Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={addNewNode}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--success, #10b981)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--success-hover, #059669)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--success, #10b981)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            + Add Node
          </button>
          
          <button
            onClick={undo}
            disabled={historyIndex <= 0}
            style={{
              padding: '8px 12px',
              backgroundColor: historyIndex <= 0 ? 'var(--muted, #f3f4f6)' : 'var(--secondary, #6b7280)',
              color: historyIndex <= 0 ? 'var(--muted-foreground, #9ca3af)' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: historyIndex <= 0 ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
            onMouseOver={(e) => {
              if (historyIndex > 0) {
                e.currentTarget.style.backgroundColor = 'var(--secondary-hover, #4b5563)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (historyIndex > 0) {
                e.currentTarget.style.backgroundColor = 'var(--secondary, #6b7280)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            ↶ Undo
          </button>
          
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            style={{
              padding: '8px 12px',
              backgroundColor: historyIndex >= history.length - 1 ? 'var(--muted, #f3f4f6)' : 'var(--secondary, #6b7280)',
              color: historyIndex >= history.length - 1 ? 'var(--muted-foreground, #9ca3af)' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: historyIndex >= history.length - 1 ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
            onMouseOver={(e) => {
              if (historyIndex < history.length - 1) {
                e.currentTarget.style.backgroundColor = 'var(--secondary-hover, #4b5563)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (historyIndex < history.length - 1) {
                e.currentTarget.style.backgroundColor = 'var(--secondary, #6b7280)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            ↷ Redo
          </button>
          
          <button
            onClick={fitView}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--info, #0ea5e9)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--info-hover, #0284c7)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--info, #0ea5e9)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🔍 Fit View
          </button>
          
          <button
            onClick={discardChanges}
            disabled={!hasUnsavedChanges}
            style={{
              padding: '8px 12px',
              backgroundColor: !hasUnsavedChanges ? 'var(--muted, #f3f4f6)' : 'var(--destructive, #ef4444)',
              color: !hasUnsavedChanges ? 'var(--muted-foreground, #9ca3af)' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: !hasUnsavedChanges ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              boxShadow: !hasUnsavedChanges ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
            onMouseOver={(e) => {
              if (hasUnsavedChanges) {
                e.currentTarget.style.backgroundColor = 'var(--destructive-hover, #dc2626)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (hasUnsavedChanges) {
                e.currentTarget.style.backgroundColor = 'var(--destructive, #ef4444)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            🗑️ Discard
          </button>
          
          <button
            onClick={saveToDatabase}
            disabled={isLoading || !hasUnsavedChanges}
            style={{
              padding: '8px 20px',
              backgroundColor: isLoading || !hasUnsavedChanges ? 'var(--muted, #f3f4f6)' : 'var(--primary, #3b82f6)',
              color: isLoading || !hasUnsavedChanges ? 'var(--muted-foreground, #9ca3af)' : 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: isLoading || !hasUnsavedChanges ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              boxShadow: isLoading || !hasUnsavedChanges ? 'none' : '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            }}
            onMouseOver={(e) => {
              if (!isLoading && hasUnsavedChanges) {
                e.currentTarget.style.backgroundColor = 'var(--primary-hover, #2563eb)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (!isLoading && hasUnsavedChanges) {
                e.currentTarget.style.backgroundColor = 'var(--primary, #3b82f6)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {isLoading ? '💾 Saving...' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* Status Messages */}
      {(error || success) && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: error ? 'var(--destructive-light, #fef2f2)' : 'var(--success-light, #f0fdf4)',
          color: error ? 'var(--destructive-dark, #991b1b)' : 'var(--success-dark, #166534)',
          borderBottom: '1px solid var(--border, #e5e7eb)',
          fontSize: '14px',
          fontWeight: '500',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {error ? `❌ ${error}` : `✅ ${success}`}
        </div>
      )}

      {/* Main content area */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* ReactFlow Canvas */}
        <div 
          ref={reactFlowWrapper} 
          style={{ 
            flex: 1,
            position: 'relative'
          }}
        >
        <ReactFlow
          nodes={nodes}
          edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodeDoubleClick={onNodeDoubleClick}
            onPaneClick={onPaneClick}
            onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
          fitView
          attributionPosition="bottom-left"
            style={{ width: '100%', height: '100%' }}
          >
            <Background />
            <Controls position="bottom-right" />
            <MiniMap 
              position="top-right"
              style={{
                backgroundColor: 'var(--card, #ffffff)', // Dark theme support
                border: '1px solid var(--border, #e5e7eb)',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
              nodeColor={(node) => {
                switch (node.data?.type) {
                  case 'screen': return '#3b82f6';
                  case 'dialog': return '#8b5cf6';
                  case 'popup': return '#f59e0b';
                  case 'overlay': return '#10b981';
                  default: return '#6b7280';
                }
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
        </ReactFlow>
        </div>

        {/* Right sidebar for selection details */}
        {(selectedNode || selectedEdge) && (
          <div style={{
            width: '320px',
            backgroundColor: 'var(--card, #ffffff)', // Dark theme support
            borderLeft: '1px solid var(--border, #e5e7eb)',
            padding: '20px',
            overflow: 'auto',
            flexShrink: 0,
            boxShadow: '-4px 0 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{ 
                margin: 0, 
                fontSize: '18px', 
                fontWeight: '600',
                color: 'var(--foreground, #111827)'
              }}>
                {selectedNode ? 'Node Properties' : 'Edge Properties'}
              </h3>
              <button
                onClick={closeSelectionPanel}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: 'var(--muted-foreground, #6b7280)',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--muted, #f3f4f6)';
                  e.currentTarget.style.color = 'var(--foreground, #111827)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--muted-foreground, #6b7280)';
                }}
              >
                ×
              </button>
            </div>

            {selectedNode && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '13px', 
                    fontWeight: '600',
                    color: 'var(--muted-foreground, #6b7280)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em'
                  }}>
                    Screen Name:
                  </label>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--muted, #f9fafb)',
                    border: '1px solid var(--border, #e5e7eb)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: 'var(--foreground, #111827)',
                    fontWeight: '500'
                  }}>
                    {selectedNode.data.label}
                  </div>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '13px', 
                    fontWeight: '600',
                    color: 'var(--muted-foreground, #6b7280)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em'
                  }}>
                    Type:
                  </label>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--muted, #f9fafb)',
                    border: '1px solid var(--border, #e5e7eb)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: 'var(--foreground, #111827)',
                    fontWeight: '500',
                    textTransform: 'capitalize'
                  }}>
                    {selectedNode.data.type}
                  </div>
                </div>

                {selectedNode.data.description && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '13px', 
                      fontWeight: '600',
                      color: 'var(--muted-foreground, #6b7280)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em'
                    }}>
                      Description:
                    </label>
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'var(--muted, #f9fafb)',
                      border: '1px solid var(--border, #e5e7eb)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: 'var(--foreground, #111827)',
                      lineHeight: '1.5'
                    }}>
                      {selectedNode.data.description}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    onClick={() => {
                      setNodeForm({
                        label: selectedNode.data.label,
                        type: selectedNode.data.type,
                        description: selectedNode.data.description || ''
                      });
                      setIsNodeDialogOpen(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: 'var(--primary, #3b82f6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary-hover, #2563eb)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary, #3b82f6)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={deleteSelected}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: 'var(--destructive, #ef4444)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--destructive-hover, #dc2626)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--destructive, #ef4444)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
            
            {selectedEdge && (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '6px', 
                    fontSize: '13px', 
                    fontWeight: '600',
                    color: 'var(--muted-foreground, #6b7280)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em'
                  }}>
                    Connection:
                  </label>
                  <div style={{
                    padding: '12px',
                    backgroundColor: 'var(--muted, #f9fafb)',
                    border: '1px solid var(--border, #e5e7eb)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: 'var(--foreground, #111827)',
                    fontWeight: '500',
                    fontFamily: 'monospace'
                  }}>
                    {selectedEdge.source} → {selectedEdge.target}
                  </div>
                </div>
                
                {selectedEdge.data?.go && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '13px', 
                      fontWeight: '600',
                      color: 'var(--muted-foreground, #6b7280)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em'
                    }}>
                      Go Action:
                    </label>
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'var(--muted, #f9fafb)',
                      border: '1px solid var(--border, #e5e7eb)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: 'var(--foreground, #111827)',
                      lineHeight: '1.5'
                    }}>
                      {selectedEdge.data.go}
                    </div>
                  </div>
                )}

                {selectedEdge.data?.comeback && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '13px', 
                      fontWeight: '600',
                      color: 'var(--muted-foreground, #6b7280)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em'
                    }}>
                      Comeback Action:
                    </label>
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'var(--muted, #f9fafb)',
                      border: '1px solid var(--border, #e5e7eb)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: 'var(--foreground, #111827)',
                      lineHeight: '1.5'
                    }}>
                      {selectedEdge.data.comeback}
                    </div>
                  </div>
                )}

                {selectedEdge.data?.description && (
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '6px', 
                      fontSize: '13px', 
                      fontWeight: '600',
                      color: 'var(--muted-foreground, #6b7280)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.025em'
                    }}>
                      Description:
                    </label>
                    <div style={{
                      padding: '12px',
                      backgroundColor: 'var(--muted, #f9fafb)',
                      border: '1px solid var(--border, #e5e7eb)',
                      borderRadius: '6px',
                      fontSize: '14px',
                      color: 'var(--foreground, #111827)',
                      lineHeight: '1.5'
                    }}>
                      {selectedEdge.data.description}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    onClick={() => {
                      setEdgeForm({
                        go: selectedEdge.data?.go || '',
                        comeback: selectedEdge.data?.comeback || '',
                        description: selectedEdge.data?.description || ''
                      });
                      setIsEdgeDialogOpen(true);
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: 'var(--primary, #3b82f6)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary-hover, #2563eb)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary, #3b82f6)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={deleteSelected}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      backgroundColor: 'var(--destructive, #ef4444)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--destructive-hover, #dc2626)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--destructive, #ef4444)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Node Edit Dialog */}
      <NodeEditDialog
        isOpen={isNodeDialogOpen}
        selectedNode={selectedNode}
        nodeForm={nodeForm}
        setNodeForm={setNodeForm}
        onSubmit={handleNodeFormSubmit}
        onDelete={handleDeleteNode}
        onClose={() => {
          setIsNodeDialogOpen(false);
          cancelNodeChanges();
        }}
      />

      {/* Edge Edit Dialog */}
      <EdgeEditDialog
        isOpen={isEdgeDialogOpen}
        selectedEdge={selectedEdge}
        edgeForm={edgeForm}
        setEdgeForm={setEdgeForm}
        onSubmit={handleEdgeFormSubmit}
        onDelete={handleDeleteEdge}
        onClose={() => setIsEdgeDialogOpen(false)}
      />

      {/* Discard Changes Confirmation Dialog */}
      {isDiscardDialogOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: 'var(--card, #ffffff)',
            padding: '32px',
            borderRadius: '12px',
            minWidth: '450px',
            maxWidth: '500px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: '1px solid var(--border, #e5e7eb)'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              fontSize: '20px', 
              fontWeight: '600',
              color: 'var(--foreground, #111827)'
            }}>
              Discard Changes?
            </h3>
            <p style={{ 
              margin: '0 0 32px 0', 
              color: 'var(--muted-foreground, #6b7280)',
              lineHeight: '1.6',
              fontSize: '15px'
            }}>
              Are you sure you want to discard all unsaved changes? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsDiscardDialogOpen(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--secondary, #6b7280)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--secondary-hover, #4b5563)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--secondary, #6b7280)';
                }}
              >
                Cancel
              </button>
              <button
                onClick={performDiscardChanges}
                style={{
                  padding: '10px 20px',
                  backgroundColor: 'var(--destructive, #ef4444)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--destructive-hover, #dc2626)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--destructive, #ef4444)';
                }}
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NavigationEditor: React.FC = () => {
  return (
    <ReactFlowProvider>
      <NavigationEditorContent />
    </ReactFlowProvider>
  );
};

export default NavigationEditor; 