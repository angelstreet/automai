import {
  Close as CloseIcon,
  PlayArrow as PlayArrowIcon,
  Route as RouteIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Paper,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  LinearProgress,
} from '@mui/material';
import React, { useEffect, useMemo } from 'react';

import { useNode } from '../../hooks/navigation/useNode';
import { useValidationColors } from '../../hooks/validation/useValidationColors';
import { UINavigationNode } from '../../types/pages/Navigation_Types';
import { getZIndex } from '../../utils/zIndexUtils';

interface NodeGotoPanelProps {
  selectedNode: UINavigationNode;
  nodes: UINavigationNode[];
  treeId: string;
  onClose: () => void;
  // Optional current node ID for navigation starting point
  currentNodeId?: string;
  // Device control props (optional for navigation preview)
  selectedHost?: any;
  selectedDeviceId?: string;
  isControlActive?: boolean;
}

export const NodeGotoPanel: React.FC<NodeGotoPanelProps> = ({
  selectedNode,
  nodes,
  treeId,
  onClose,
  currentNodeId,
  selectedHost,
  selectedDeviceId,
  isControlActive = false,
}) => {
  // Use the consolidated node hook
  const nodeHook = useNode({
    selectedHost,
    selectedDeviceId,
    isControlActive,
    treeId,
    currentNodeId,
  });

  // Get validation colors hook for resetting edge colors
  const { resetNavigationEdgeColors } = useValidationColors();

  // Memoize the functions we need to avoid recreating them on every render
  const { clearNavigationMessages, loadNavigationPreview } = useMemo(
    () => ({
      clearNavigationMessages: nodeHook.clearNavigationMessages,
      loadNavigationPreview: nodeHook.loadNavigationPreview,
    }),
    [nodeHook.clearNavigationMessages, nodeHook.loadNavigationPreview],
  );

  // Load navigation preview on component mount and when key dependencies change
  useEffect(() => {
    // Always load navigation preview to show current path
    // This ensures the "from" node is always up-to-date with the current position
    clearNavigationMessages();
    loadNavigationPreview(selectedNode, nodes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    treeId,
    selectedNode.id,
    currentNodeId,
    selectedNode,
    clearNavigationMessages,
    loadNavigationPreview,
    // Removed 'nodes' from dependencies to prevent infinite loop
    // loadNavigationPreview now only updates minimap when shouldUpdateMinimap=true (during execution)
  ]);

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 360,
        height: 'calc(100vh - 180px)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: getZIndex('NAVIGATION_GOTO_PANEL'),
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header - Fixed at top */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          p: 2,
          pb: 1,
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <RouteIcon color="primary" />
          <Typography variant="h6" sx={{ margin: 0, fontSize: '1.1rem' }}>
            Go To Node
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

      {/* Single Scrollable Content Area */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 1,
          pt: 1,
          pb: 0.5,
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0,0,0,0.1)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(0,0,0,0.3)',

            '&:hover': {
              background: 'rgba(0,0,0,0.5)',
            },
          },
        }}
      >
        {/* Node Information */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Target: {selectedNode.data.label}
          </Typography>
          <Chip label={selectedNode.data.type} size="small" sx={{ fontSize: '0.75rem' }} />
        </Box>

        <Box
          sx={{ display: 'flex', gap: 2, mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}
        >
          <Typography variant="body2">
            <strong>Depth:</strong> {selectedNode.data.depth || 0}
          </Typography>
          <Typography variant="body2">
            <strong>Parent:</strong>{' '}
            {nodeHook.getParentNames(selectedNode.data.parent || [], nodes)}
          </Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Navigation Path */}
        <Box sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Path: {nodeHook.getFullPath(selectedNode, nodes)}
          </Typography>
        </Box>

        {/* Navigation Steps */}
        <Box
          sx={{
            mb: 0.5,
            border: '1px solid',
            borderColor: 'grey.300',
            borderRadius: 1,
            p: 1,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0 }}>
            Navigation Steps:
          </Typography>

          {!nodeHook.isLoadingPreview &&
            nodeHook.navigationTransitions &&
            nodeHook.navigationTransitions.length > 0 && (
              <Box>
                {nodeHook.navigationTransitions.map((transition, index) => {
                  const transitionData = transition as any;
                  return (
                    <Box
                      key={index}
                      sx={{
                        mb: 0,
                        p: 0.5,
                        borderRadius: 1,
                        '&:last-child': { mb: 0 },
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '0.875rem' }}
                      >
                        {transitionData.transition_number || index + 1}.{' '}
                        {transitionData.from_node_label || 'Start'} →{' '}
                        {transitionData.to_node_label || 'Target'}
                      </Typography>

                      {transitionData.actions && transitionData.actions.length > 0 ? (
                        <Box sx={{ ml: 1.5 }}>
                          {transitionData.actions.map((action: any, actionIndex: number) => {
                            // Generic display: command and first parameter
                            const getActionDisplayText = (action: any) => {
                              const command = action.command || 'unknown_action';
                              const params = action.params || {};

                              // If there are parameters, show the first one
                              if (params && Object.keys(params).length > 0) {
                                const firstParam = Object.values(params)[0];
                                const paramStr =
                                  typeof firstParam === 'string'
                                    ? firstParam
                                    : JSON.stringify(firstParam);
                                const truncatedParam =
                                  paramStr.length > 30
                                    ? `${paramStr.substring(0, 30)}...`
                                    : paramStr;
                                return `${command}(${truncatedParam})`;
                              } else {
                                return command;
                              }
                            };

                            return (
                              <Typography
                                key={actionIndex}
                                variant="body2"
                                sx={{
                                  fontSize: '0.8rem',
                                  color: 'text.secondary',
                                  mb: 0,
                                  fontFamily: 'monospace',
                                  '&:before': {
                                    content: '"- "',
                                    fontWeight: 'bold',
                                  },
                                }}
                              >
                                {getActionDisplayText(action)}
                              </Typography>
                            );
                          })}
                        </Box>
                      ) : (
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: '0.8rem',
                            color: 'text.secondary',
                            ml: 1.5,
                            fontStyle: 'italic',
                          }}
                        >
                          No actions defined
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}

          {!nodeHook.isLoadingPreview &&
            (!nodeHook.navigationTransitions || nodeHook.navigationTransitions.length === 0) && (
              <Typography variant="body2" color="text.secondary">
                No navigation path available
              </Typography>
            )}

          {nodeHook.isLoadingPreview && (
            <Typography variant="body2" color="text.secondary">
              Loading navigation steps...
            </Typography>
          )}
        </Box>

        {/* Node Verifications */}
        <Box
          sx={{
            border: '1px solid',
            borderColor: 'grey.300',
            borderRadius: 1,
            p: 1,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0 }}>
            Verifications:
          </Typography>

          {selectedNode.data.verifications && selectedNode.data.verifications.length > 0 ? (
            <Box>
              {selectedNode.data.verifications.map((verification, index) => (
                <Box
                  key={verification.command || index}
                  sx={{
                    mb: 0,
                    p: 0.5,

                    '&:last-child': { mb: 0 },
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '0.875rem' }}
                  >
                    {index + 1}. {verification.command || 'Unnamed Verification'}
                  </Typography>

                  <Box sx={{ ml: 1.5 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontSize: '0.8rem',
                        color: 'text.secondary',
                        mb: 0.25,
                      }}
                    >
                      <strong>Type:</strong> {verification.verification_type || 'No type'}
                    </Typography>

                    {verification.verification_type === 'text' && verification.params?.text && (
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: '0.8rem',
                          color: 'primary.main',
                          fontWeight: 'bold',
                        }}
                      >
                        Text: {(verification.params as any).text}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontStyle: 'italic',
                fontSize: '0.875rem',
                p: 0.75,
              }}
            >
              No verifications configured for this node
            </Typography>
          )}
        </Box>
      </Box>

      {/* Fixed Button at Bottom */}
      <Box
        sx={{
          flexShrink: 0,
          p: 1,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={
            nodeHook.isExecuting ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <PlayArrowIcon />
            )
          }
          onClick={() => {
            // Reset edge colors before starting new navigation
            resetNavigationEdgeColors();
            nodeHook.executeNavigation(selectedNode);
          }}
          disabled={
            nodeHook.isExecuting ||
            nodeHook.isLoadingPreview ||
            !nodeHook.navigationTransitions ||
            nodeHook.navigationTransitions.length === 0 ||
            nodeHook.navigationError !== null ||
            // Disable if any transition has no actions defined
            nodeHook.navigationTransitions.some(
              (transition: any) => !transition.actions || transition.actions.length === 0,
            )
          }
          fullWidth
          sx={{ fontSize: '0.875rem' }}
        >
          {nodeHook.isExecuting ? 'Executing...' : 'Run'}
        </Button>

        {nodeHook.isExecuting && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress />
          </Box>
        )}

        {/* Status Display */}
        {nodeHook.navigationError && (
          <Alert
            severity="error"
            icon={<ErrorIcon />}
            sx={{
              mt: 0.5,
              fontSize: '0.875rem',
              color: 'error.main',
              backgroundColor: 'error.light',
              '& .MuiAlert-icon': {
                color: 'error.main',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'error.main' }}>
              {nodeHook.navigationError}
            </Typography>
          </Alert>
        )}
        {!nodeHook.navigationError && nodeHook.executionMessage && (
          <Alert severity="success" sx={{ mt: 0.5, fontSize: '0.875rem' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {nodeHook.executionMessage}
            </Typography>
          </Alert>
        )}
      </Box>
    </Paper>
  );
};
