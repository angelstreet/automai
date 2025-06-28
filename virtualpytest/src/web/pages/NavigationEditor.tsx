import React from 'react';
import { NavigationEditorProvider } from '../contexts/navigation/NavigationEditorProvider';
import { useNavigation } from '../hooks/navigation/useNavigation';

// Simple NavigationEditor component showing how to use the new unified context
const NavigationEditorContent: React.FC = () => {
  const {
    // All navigation state is now available from a single hook
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    isNodeDialogOpen,
    isEdgeDialogOpen,
    nodeForm,
    edgeForm,
    isLoading,
    error,
    success,
    hasUnsavedChanges,

    // All setters are available
    setNodes,
    setEdges,
    setSelectedNode,
    setSelectedEdge,
    setIsNodeDialogOpen,
    setIsEdgeDialogOpen,
    setNodeForm,
    setEdgeForm,

    // All actions are available
    openNodeDialog,
    openEdgeDialog,
    closeAllDialogs,
    resetAll,
    markUnsavedChanges,
    clearUnsavedChanges,
    fitViewToNodes,
  } = useNavigation();

  return (
    <div className="navigation-editor">
      <h1>Navigation Editor</h1>
      <p>Nodes: {nodes.length}</p>
      <p>Edges: {edges.length}</p>
      <p>Selected Node: {selectedNode?.id || 'None'}</p>
      <p>Selected Edge: {selectedEdge?.id || 'None'}</p>
      <p>Has Unsaved Changes: {hasUnsavedChanges ? 'Yes' : 'No'}</p>

      {error && <div className="error">Error: {error}</div>}
      {success && <div className="success">Success: {success}</div>}
      {isLoading && <div className="loading">Loading...</div>}

      <div className="actions">
        <button onClick={() => openNodeDialog()}>Add Node</button>
        <button onClick={() => openEdgeDialog()}>Add Edge</button>
        <button onClick={closeAllDialogs}>Close Dialogs</button>
        <button onClick={resetAll}>Reset All</button>
        <button onClick={fitViewToNodes}>Fit View</button>
      </div>

      {/* Dialog states */}
      {isNodeDialogOpen && (
        <div className="dialog">
          <h3>Node Dialog Open</h3>
          <p>Form: {JSON.stringify(nodeForm)}</p>
        </div>
      )}

      {isEdgeDialogOpen && (
        <div className="dialog">
          <h3>Edge Dialog Open</h3>
          <p>Form: {JSON.stringify(edgeForm)}</p>
        </div>
      )}
    </div>
  );
};

// Main NavigationEditor component with provider
const NavigationEditor: React.FC = () => {
  return (
    <NavigationEditorProvider>
      <NavigationEditorContent />
    </NavigationEditorProvider>
  );
};

export default NavigationEditor;
