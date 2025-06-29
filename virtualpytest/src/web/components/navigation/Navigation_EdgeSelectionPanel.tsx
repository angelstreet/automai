import { Close as CloseIcon } from '@mui/icons-material';
import { Box, Typography, Button, IconButton, Paper, LinearProgress } from '@mui/material';
import React, { useState, useEffect } from 'react';

import { useAction } from '../../hooks/actions';
import { Host } from '../../types/common/Host_Types';
import { UINavigationEdge, EdgeAction, EdgeForm } from '../../types/pages/Navigation_Types';
// ❌ REMOVED: Direct database access - using API endpoints instead
// ❌ REMOVED: Confidence utils moved to database

interface EdgeSelectionPanelProps {
  selectedEdge: UINavigationEdge;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  setEdgeForm: React.Dispatch<React.SetStateAction<EdgeForm>>;
  setIsEdgeDialogOpen: (open: boolean) => void;

  // Device control props
  isControlActive?: boolean;
  selectedHost?: Host; // Make optional to fix regression
}

export const EdgeSelectionPanel: React.FC<EdgeSelectionPanelProps> = React.memo(
  ({
    selectedEdge,
    onClose,
    onEdit: _onEdit,
    onDelete,
    setEdgeForm,
    setIsEdgeDialogOpen,

    isControlActive = false,
    selectedHost,
  }) => {
    // Use centralized action hook
    const actionHook = useAction({
      selectedHost: selectedHost || null,
      deviceId: undefined, // EdgeSelectionPanel doesn't have specific device selection
    });

    const [runResult, setRunResult] = useState<string | null>(null);
    // ❌ REMOVED: Local action updates for confidence tracking

    // Extract controller types from device model

    // Get actions in consistent format (handle both new and legacy formats)
    const getActions = (): EdgeAction[] => {
      // Handle new format (multiple actions)
      if (selectedEdge.data?.actions && selectedEdge.data.actions.length > 0) {
        return selectedEdge.data.actions;
      }

      // Handle legacy format (single action) - convert to array
      if (selectedEdge.data?.action && typeof selectedEdge.data.action === 'object') {
        const legacyAction = selectedEdge.data.action as any;
        return [
          {
            id: legacyAction.id,
            label: legacyAction.label,
            command: legacyAction.command,
            params: legacyAction.params,
            requiresInput: legacyAction.requiresInput,
            inputValue: legacyAction.inputValue,
            waitTime: legacyAction.waitTime || 2000, // Default wait time
            // ❌ REMOVED: Confidence tracking moved to database
          },
        ];
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
    const canRunActions = isControlActive && selectedHost && hasActions && !actionHook.loading;

    // Clear run results when edge selection changes
    useEffect(() => {
      setRunResult(null);
    }, [selectedEdge.id]);

    // Check if edge can be deleted (protect edges from entry points and home nodes)
    const isProtectedEdge =
      selectedEdge.data?.from === 'entry' ||
      selectedEdge.data?.from === 'home' ||
      selectedEdge.data?.from?.toLowerCase() === 'entry point' ||
      selectedEdge.data?.from?.toLowerCase().includes('entry') ||
      selectedEdge.data?.from?.toLowerCase().includes('home') ||
      selectedEdge.source === 'entry-node' ||
      selectedEdge.source?.toLowerCase().includes('entry') ||
      selectedEdge.source?.toLowerCase().includes('home');

    // ❌ REMOVED: Confidence calculation moved to database

    const handleEdit = () => {
      console.log('[@component:EdgeSelectionPanel] Opening edit dialog for edge');

      // Populate the form with current edge data
      setEdgeForm({
        description: selectedEdge.data?.description || '',
        actions: getActions(),
        retryActions: getRetryActions(),
        finalWaitTime: selectedEdge.data?.finalWaitTime ?? 2000,
      });

      setIsEdgeDialogOpen(true);
    };

    // ❌ REMOVED: Action result updates moved to database

    // Execute all edge actions using centralized hook
    const handleRunActions = async () => {
      if (actions.length === 0) {
        console.log('[@component:EdgeSelectionPanel] No actions to run');
        return;
      }

      if (actionHook.loading) {
        console.log(
          '[@component:EdgeSelectionPanel] Execution already in progress, ignoring duplicate request',
        );
        return;
      }

      setRunResult(null);
      console.log(
        `[@component:EdgeSelectionPanel] Starting batch execution of ${actions.length} actions with ${retryActions.length} retry actions`,
      );

      try {
        const result = await actionHook.executeActions(
          actions,
          retryActions,
          selectedEdge.data?.finalWaitTime || 2000,
        );

        // Format the result for display
        const formattedResult = actionHook.formatExecutionResults(result);
        setRunResult(formattedResult);
      } catch (err: any) {
        console.error('[@component:EdgeSelectionPanel] Error executing actions:', err);
        setRunResult(`❌ Network error: ${err.message}`);
      }
    };

    // Format result for compact display
    const formatRunResult = (result: string): string => {
      if (!result) return '';

      const lines = result.split('\n');
      const formattedLines: string[] = [];

      for (const line of lines) {
        // Skip verbose messages we don't want
        if (
          line.includes('⏹️ Execution stopped due to failed action') ||
          line.includes('📋 Processing') ||
          line.includes('retry action(s)')
        ) {
          continue;
        }

        // Format action lines to be more compact
        if (line.includes('Action') && (line.includes('✅') || line.includes('❌'))) {
          formattedLines.push(line);
        }
        // Format retry action lines to be more compact
        else if (line.includes('Retry Action') && (line.includes('✅') || line.includes('❌'))) {
          formattedLines.push(line);
        }
        // Keep confidence lines
        else if (line.includes('📊 Confidence:')) {
          formattedLines.push(line);
        }
        // Keep overall result
        else if (line.includes('OVERALL RESULT:')) {
          formattedLines.push(line);
        }
        // Keep starting retry actions message but make it shorter
        else if (line.includes('🔄 Main actions failed. Starting retry actions...')) {
          formattedLines.push('🔄 Starting retry actions...');
        }
      }

      return formattedLines.join('\n');
    };

    return (
      <Paper
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 360,
          p: 1.5,
          zIndex: 1000,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <Box>
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6" sx={{ margin: 0, fontSize: '1rem' }}>
                Edge Selection
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation(); // Prevent event from bubbling to ReactFlow pane
                onClose();
              }}
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
                    <span style={{ color: '#666', marginLeft: '4px' }}>→ {action.inputValue}</span>
                  )}
                </Typography>
              ))}
            </Box>
          )}

          {/* Show if no actions configured */}
          {actions.length === 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1, fontSize: '0.75rem', fontStyle: 'italic' }}
            >
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
                disabled={!isControlActive || !selectedHost}
                title={
                  !isControlActive || !selectedHost ? 'Device control required to edit edges' : ''
                }
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
                  !isControlActive || !selectedHost ? 'Device control required to test actions' : ''
                }
              >
                {actionHook.loading ? 'Running...' : 'Run'}
              </Button>
            )}

            {/* Linear Progress - shown when running */}
            {actionHook.loading && <LinearProgress sx={{ mt: 0.5, borderRadius: 1 }} />}

            {/* Run result display - with scrolling */}
            {runResult && (
              <Box
                sx={{
                  mt: 0.5,
                  p: 0.5,
                  bgcolor: runResult.includes('❌ OVERALL RESULT: FAILED')
                    ? 'error.light'
                    : runResult.includes('✅ OVERALL RESULT: SUCCESS')
                      ? 'success.light'
                      : runResult.includes('❌') && !runResult.includes('✅')
                        ? 'error.light'
                        : runResult.includes('⚠️')
                          ? 'warning.light'
                          : 'success.light',
                  borderRadius: 0.5,
                  maxHeight: '150px', // Limit height to enable scrolling
                  overflow: 'auto', // Enable scrolling
                  border: '1px solid rgba(0, 0, 0, 0.12)', // Add subtle border
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    whiteSpace: 'pre-line',
                    fontSize: '0.7rem', // Slightly smaller font for compactness
                    lineHeight: 1.2, // Tighter line spacing
                  }}
                >
                  {formatRunResult(runResult)}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    );
  },
);
