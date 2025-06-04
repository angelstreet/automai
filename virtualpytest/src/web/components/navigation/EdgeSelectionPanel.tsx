import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  LinearProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';
import { UINavigationEdge, EdgeForm, EdgeAction } from '../../types/navigationTypes';
import { calculateConfidenceScore } from '../../utils/confidenceUtils';
import { executeEdgeActions } from '../../utils/navigationApi';

interface EdgeSelectionPanelProps {
  selectedEdge: UINavigationEdge;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  setEdgeForm: React.Dispatch<React.SetStateAction<EdgeForm>>;
  setIsEdgeDialogOpen: (open: boolean) => void;
  onUpdateEdge?: (edgeId: string, updatedData: any) => void; // Add callback for updating edge data
  // Device control props
  isControlActive?: boolean;
  selectedDevice?: string | null;
  controllerTypes?: string[]; // e.g., ["android_mobile"]
}

export const EdgeSelectionPanel: React.FC<EdgeSelectionPanelProps> = ({
  selectedEdge,
  onClose,
  onEdit,
  onDelete,
  setEdgeForm,
  setIsEdgeDialogOpen,
  onUpdateEdge,
  isControlActive = false,
  selectedDevice = null,
  controllerTypes = [],
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);

  // Get actions in consistent format (handle both new and legacy formats)
  const getActions = (): EdgeAction[] => {
    // Handle new format (multiple actions)
    if (selectedEdge.data?.actions && selectedEdge.data.actions.length > 0) {
      return selectedEdge.data.actions;
    }
    
    // Handle legacy format (single action) - convert to array
    if (selectedEdge.data?.action && typeof selectedEdge.data.action === 'object') {
      const legacyAction = selectedEdge.data.action as any;
      return [{
        id: legacyAction.id,
        label: legacyAction.label,
        command: legacyAction.command,
        params: legacyAction.params,
        requiresInput: legacyAction.requiresInput,
        inputValue: legacyAction.inputValue,
        waitTime: legacyAction.waitTime || 2000, // Default wait time
        last_run_result: legacyAction.last_run_result || [], // Initialize empty array
      }];
    }
    
    return [];
  };

  // Get retry actions
  const getRetryActions = (): EdgeAction[] => {
    return selectedEdge.data?.retryActions || [];
  };

  const actions = getActions();
  const retryActions = getRetryActions();
  const hasActions = actions.length > 0;
  const canRunActions = isControlActive && selectedDevice && hasActions && !isRunning;

  // Clear run results when edge selection changes
  useEffect(() => {
    setRunResult(null);
  }, [selectedEdge.id]);

  // Check if edge can be deleted (protect edges from entry points and home nodes)
  const isProtectedEdge = selectedEdge.data?.from === 'entry' || 
                         selectedEdge.data?.from === 'home' ||
                         selectedEdge.data?.from?.toLowerCase() === 'entry point' ||
                         selectedEdge.data?.from?.toLowerCase().includes('entry') ||
                         selectedEdge.data?.from?.toLowerCase().includes('home') ||
                         selectedEdge.source === 'entry-node' ||
                         selectedEdge.source?.toLowerCase().includes('entry') ||
                         selectedEdge.source?.toLowerCase().includes('home');

  // Calculate overall confidence for edge actions
  const getEdgeConfidenceInfo = (): { actionCount: number; score: number | null; text: string } => {
    if (actions.length === 0) {
      return { actionCount: 0, score: null, text: 'no actions' };
    }
    
    // Get all actions with results
    const actionsWithResults = actions.filter(action => 
      action.last_run_result && action.last_run_result.length > 0
    );
    
    if (actionsWithResults.length === 0) {
      return { actionCount: actions.length, score: null, text: 'unknown' };
    }
    
    // Calculate average confidence across all actions
    const confidenceScores = actionsWithResults.map(action => 
      calculateConfidenceScore(action.last_run_result)
    );
    const averageConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    
    return { 
      actionCount: actions.length,
      score: averageConfidence, 
      text: `${(averageConfidence * 100).toFixed(0)}%` 
    };
  };

  const confidenceInfo = getEdgeConfidenceInfo();

  const handleEdit = () => {
    console.log('[@component:EdgeSelectionPanel] Opening edit dialog for edge');
    
    // Populate the form with current edge data
    setEdgeForm({
      description: selectedEdge.data?.description || '',
      actions: getActions(),
      retryActions: getRetryActions(),
      finalWaitTime: selectedEdge.data?.finalWaitTime || 2000,
    });
    
    setIsEdgeDialogOpen(true);
  };

  const updateActionResults = (actionIndex: number, success: boolean) => {
    if (!onUpdateEdge) return;

    const updatedActions = [...actions];
    const action = updatedActions[actionIndex];
    
    // Update the last_run_result array
    const currentResults = action.last_run_result || [];
    const newResults = [success, ...currentResults].slice(0, 10); // Keep last 10 results
    
    updatedActions[actionIndex] = {
      ...action,
      last_run_result: newResults
    };

    // Update the edge data
    const updatedEdgeData = {
      ...selectedEdge.data,
      actions: updatedActions
    };

    // Call the parent callback to update the edge
    onUpdateEdge(selectedEdge.id, updatedEdgeData);
  };

  // Execute all edge actions sequentially
  const handleRunActions = async () => {
    if (actions.length === 0) {
      console.log('[@component:EdgeSelectionPanel] No actions to run');
      return;
    }
    
    setIsRunning(true);
    setRunResult(null);
    
    try {
      const finalWaitTime = selectedEdge.data?.finalWaitTime || 2000;
      
      const result = await executeEdgeActions(
        actions,
        controllerTypes,
        updateActionResults, // Pass the callback to update edge data
        finalWaitTime
      );
      
      setRunResult(result.results.join('\n'));
      console.log(`[@component:EdgeSelectionPanel] Action execution completed. Stopped: ${result.executionStopped}`);
      
    } catch (err: any) {
      console.error('[@component:EdgeSelectionPanel] Error executing actions:', err);
      setRunResult(`❌ ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 280,
        p: 1.5,
        zIndex: 1000,
      }}
    >
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ margin: 0, fontSize: '1rem' }}>
              Edge Selection
            </Typography>
            {/* Show confidence percentage with color coding if available */}
            {confidenceInfo.score !== null && (
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  color: confidenceInfo.score >= 0.7 ? '#4caf50' : // Green for 70%+
                         confidenceInfo.score >= 0.5 ? '#ff9800' : // Orange for 50-70%
                         '#f44336', // Red for <50%
                  padding: '2px 6px',
                  borderRadius: '4px',
                }}
              >
                {confidenceInfo.text}
              </Typography>
            )}
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ p: 0.25 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
        
        {/* Show From/To information */}
        {selectedEdge.data?.from && (
          <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
            From: {selectedEdge.data.from}
          </Typography>
        )}
        {selectedEdge.data?.to && (
          <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
            To: {selectedEdge.data.to}
          </Typography>
        )}

        {/* Show actions list */}
        {actions.length > 0 && (
          <Box sx={{ mb: 1 }}>
            {actions.map((action, index) => (
              <Typography key={index} variant="body2" sx={{ fontSize: '0.75rem', mb: 0.3 }}>
                {index + 1}. {action.label || 'No action selected'}
                {action.requiresInput && action.inputValue && (
                  <span style={{ color: '#666', marginLeft: '4px' }}>
                    → {action.inputValue}
                  </span>
                )}
              </Typography>
            ))}
          </Box>
        )}

        {/* Show if no actions configured */}
        {actions.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1, fontSize: '0.75rem', fontStyle: 'italic' }}>
            No actions configured
          </Typography>
        )}

        <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {/* Edit and Delete buttons */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <Button
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.75rem', px: 1, flex: 1 }}
              onClick={handleEdit}
            >
              Edit
            </Button>
            {/* Only show delete button if not a protected edge */}
            {!isProtectedEdge && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                sx={{ fontSize: '0.75rem', px: 1, flex: 1 }}
                onClick={onDelete}
              >
                Delete
              </Button>
            )}
          </Box>

          {/* Run button - only shown when actions exist */}
          {hasActions && (
            <Button
              size="small"
              variant="contained"
              sx={{ fontSize: '0.75rem', px: 1 }}
              onClick={handleRunActions}
              disabled={!canRunActions}
              title={
                !isControlActive || !selectedDevice 
                  ? 'Device control required to test actions' 
                  : ''
              }
            >
              {isRunning ? 'Running...' : 'Run'}
            </Button>
          )}

          {/* Linear Progress - shown when running */}
          {isRunning && (
            <LinearProgress sx={{ mt: 0.5, borderRadius: 1 }} />
          )}

          {/* Run result display */}
          {runResult && (
            <Box sx={{ 
              mt: 0.5,
              p: 0.5,
              bgcolor: runResult.includes('❌') ? 'error.light' : 
                       runResult.includes('⚠️') ? 'warning.light' : 'success.light',
              borderRadius: 0.5
            }}>
              <Typography variant="caption" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {runResult}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Paper>
  );
}; 