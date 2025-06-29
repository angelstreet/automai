import { Close as CloseIcon } from '@mui/icons-material';
import { Box, Typography, Button, IconButton, Paper, LinearProgress } from '@mui/material';
import React, { useEffect, useMemo } from 'react';

import { useEdge } from '../../hooks/navigation/useEdge';
import { Host } from '../../types/common/Host_Types';
import { UINavigationEdge, EdgeForm } from '../../types/pages/Navigation_Types';

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
    // Use the consolidated edge hook
    const edgeHook = useEdge({
      selectedHost: selectedHost || null,
      isControlActive,
    });

    // Get actions and retry actions using hook functions
    const actions = edgeHook.getActionsFromEdge(selectedEdge);
    const hasActions = actions.length > 0;
    const canRunActions = edgeHook.canRunActions(selectedEdge);

    // Memoize the clearResults function to avoid recreating it on every render
    const clearResults = useMemo(() => edgeHook.clearResults, [edgeHook.clearResults]);

    // Clear run results when edge selection changes
    useEffect(() => {
      clearResults();
    }, [selectedEdge.id, clearResults]);

    // Check if edge can be deleted using hook function
    const isProtectedEdge = edgeHook.isProtectedEdge(selectedEdge);

    const handleEdit = () => {
      // Create edge form using hook function
      const edgeForm = edgeHook.createEdgeForm(selectedEdge);
      setEdgeForm(edgeForm);
      setIsEdgeDialogOpen(true);
    };

    // Execute all edge actions using hook function
    const handleRunActions = async () => {
      await edgeHook.executeEdgeActions(selectedEdge);
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
              {actions.map((action, index) => {
                // Format action display with command and parameters
                const formatActionDisplay = (action: any) => {
                  if (!action.command) return 'No action selected';

                  const commandDisplay = action.command.replace(/_/g, ' ').trim();
                  const params = action.params || {};

                  // Build parameter display based on action type
                  const paramParts = [];

                  switch (action.command) {
                    case 'press_key':
                      if (params.key) paramParts.push(`"${params.key}"`);
                      break;
                    case 'input_text':
                      if (params.text) paramParts.push(`"${params.text}"`);
                      break;
                    case 'click_element':
                      if (params.element_identifier)
                        paramParts.push(`"${params.element_identifier}"`);
                      break;
                    case 'tap_coordinates':
                      if (params.x !== undefined && params.y !== undefined) {
                        paramParts.push(`(${params.x}, ${params.y})`);
                      }
                      break;
                    case 'swipe':
                      if (params.direction) paramParts.push(`"${params.direction}"`);
                      break;
                    case 'launch_app':
                    case 'close_app':
                      if (params.package) paramParts.push(`"${params.package}"`);
                      break;
                    case 'wait':
                      if (params.duration) paramParts.push(`${params.duration}s`);
                      break;
                    case 'scroll':
                      if (params.direction) paramParts.push(`"${params.direction}"`);
                      if (params.amount) paramParts.push(`${params.amount}x`);
                      break;
                  }

                  // Add delay if specified and not default
                  if (params.delay && params.delay !== 0.5) {
                    paramParts.push(`delay: ${params.delay}s`);
                  }

                  const paramDisplay = paramParts.length > 0 ? ` → ${paramParts.join(', ')}` : '';
                  return `${commandDisplay}${paramDisplay}`;
                };

                return (
                  <Typography key={index} variant="body2" sx={{ fontSize: '0.75rem', mb: 0.3 }}>
                    {index + 1}. {formatActionDisplay(action)}
                  </Typography>
                );
              })}
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
                {edgeHook.actionHook.loading ? 'Running...' : 'Run'}
              </Button>
            )}

            {/* Linear Progress - shown when running */}
            {edgeHook.actionHook.loading && <LinearProgress sx={{ mt: 0.5, borderRadius: 1 }} />}

            {/* Run result display - with scrolling */}
            {edgeHook.runResult && (
              <Box
                sx={{
                  mt: 0.5,
                  p: 0.5,
                  bgcolor: edgeHook.runResult.includes('❌ OVERALL RESULT: FAILED')
                    ? 'error.light'
                    : edgeHook.runResult.includes('✅ OVERALL RESULT: SUCCESS')
                      ? 'success.light'
                      : edgeHook.runResult.includes('❌') && !edgeHook.runResult.includes('✅')
                        ? 'error.light'
                        : edgeHook.runResult.includes('⚠️')
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
                  {edgeHook.formatRunResult(edgeHook.runResult)}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    );
  },
);
