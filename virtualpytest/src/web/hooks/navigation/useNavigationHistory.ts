import { useCallback } from 'react';
import { UINavigationNode, UINavigationEdge } from '../../types/navigationTypes';

interface HistoryState {
  history: { nodes: UINavigationNode[], edges: UINavigationEdge[] }[];
  historyIndex: number;
  setHistory: (history: { nodes: UINavigationNode[], edges: UINavigationEdge[] }[]) => void;
  setHistoryIndex: (index: number) => void;
}

interface HistoryActions {
  saveToHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface NodesEdgesState {
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  setNodes: (nodes: UINavigationNode[]) => void;
  setEdges: (edges: UINavigationEdge[]) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
}

export const useNavigationHistory = (
  historyState: HistoryState,
  nodesEdgesState: NodesEdgesState
): HistoryActions => {
  const { history, historyIndex, setHistory, setHistoryIndex } = historyState;
  const { nodes, edges, setNodes, setEdges, setHasUnsavedChanges } = nodesEdgesState;

  // Function to save current state to history
  const saveToHistory = useCallback(() => {
    console.log('[@hook:useNavigationHistory] Saving current state to history');
    const newState = { nodes: [...nodes], edges: [...edges] };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [nodes, edges, history, historyIndex, setHistory, setHistoryIndex]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      console.log('[@hook:useNavigationHistory] Performing undo operation');
      const previousState = history[historyIndex - 1];
      setNodes([...previousState.nodes]);
      setEdges([...previousState.edges]);
      setHistoryIndex(historyIndex - 1);
      setHasUnsavedChanges(true);
    } else {
      console.log('[@hook:useNavigationHistory] Cannot undo - at beginning of history');
    }
  }, [history, historyIndex, setNodes, setEdges, setHistoryIndex, setHasUnsavedChanges]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      console.log('[@hook:useNavigationHistory] Performing redo operation');
      const nextState = history[historyIndex + 1];
      setNodes([...nextState.nodes]);
      setEdges([...nextState.edges]);
      setHistoryIndex(historyIndex + 1);
      setHasUnsavedChanges(true);
    } else {
      console.log('[@hook:useNavigationHistory] Cannot redo - at end of history');
    }
  }, [history, historyIndex, setNodes, setEdges, setHistoryIndex, setHasUnsavedChanges]);

  // Check if undo/redo operations are available
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    saveToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}; 