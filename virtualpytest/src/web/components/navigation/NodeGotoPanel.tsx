import React, { useState, useEffect } from 'react';
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
import {
  Close as CloseIcon,
  PlayArrow as PlayArrowIcon,
  Route as RouteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { UINavigationNode } from '../../types/navigationTypes';
import { NavigationApi, NavigationStep, NavigationPreviewResponse } from '../../utils/navigationApi';

interface NodeGotoPanelProps {
  selectedNode: UINavigationNode;
  nodes: UINavigationNode[];
  treeId: string;
  onClose: () => void;
  // Optional current node ID for navigation starting point
  currentNodeId?: string;
}

export const NodeGotoPanel: React.FC<NodeGotoPanelProps> = ({
  selectedNode,
  nodes,
  treeId,
  onClose,
  currentNodeId,
}) => {
  // State management
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isTakeControlActive, setIsTakeControlActive] = useState<boolean>(false);
  const [isCheckingTakeControl, setIsCheckingTakeControl] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Helper function to get parent names from parent IDs
  const getParentNames = (parentIds: string[]): string => {
    if (!parentIds || parentIds.length === 0) return 'Root';
    if (!nodes || !Array.isArray(nodes)) return 'Unknown';
    
    const parentNames = parentIds.map(id => {
      const parentNode = nodes.find(node => node.id === id);
      return parentNode ? parentNode.data.label : id;
    });
    
    return parentNames.join(' → ');
  };

  // Helper function to build path from root to current node
  const getFullPath = (): string => {
    const parentNames = getParentNames(selectedNode.data.parent || []);
    if (parentNames === 'Root') {
      return selectedNode.data.label;
    }
    return `${parentNames} → ${selectedNode.data.label}`;
  };

  // Load navigation preview on component mount
  useEffect(() => {
    // Clear any previous execution messages when loading for a new node
    setError(null);
    setExecutionResult(null);
    setExecutionMessage(null);
    
    loadNavigationPreview();
    checkTakeControlStatus();
  }, [treeId, selectedNode.id, currentNodeId]);

  const loadNavigationPreview = async () => {
    setIsLoadingPreview(true);
    setError(null);

    try {
      console.log(`[@component:NodeGotoPanel] Loading navigation preview for node: ${selectedNode.id}`);
      
      const response = await NavigationApi.getNavigationPreview(
        treeId,
        selectedNode.id,
        currentNodeId
      );

      if (response.success) {
        setNavigationSteps(response.steps);
        console.log(`[@component:NodeGotoPanel] Loaded ${response.total_steps} navigation steps`);
      } else {
        setError(response.error || 'Failed to load navigation preview');
      }
    } catch (err) {
      setError(`Failed to load navigation preview: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const checkTakeControlStatus = async () => {
    setIsCheckingTakeControl(true);

    try {
      console.log(`[@component:NodeGotoPanel] Checking take control status for tree: ${treeId}`);
      
      const response = await NavigationApi.getTakeControlStatus(treeId);

      if (response.success) {
        setIsTakeControlActive(response.take_control_active);
        console.log(`[@component:NodeGotoPanel] Take control status: ${response.take_control_active ? 'ACTIVE' : 'INACTIVE'}`);
      } else {
        console.warn(`[@component:NodeGotoPanel] Failed to check take control status: ${response.error}`);
        setIsTakeControlActive(false);
      }
    } catch (err) {
      console.warn(`[@component:NodeGotoPanel] Error checking take control status: ${err}`);
      setIsTakeControlActive(false);
    } finally {
      setIsCheckingTakeControl(false);
    }
  };

  const executeNavigation = async () => {
    setIsExecuting(true);
    setError(null);
    setExecutionResult(null);

    try {
      console.log(`[@component:NodeGotoPanel] Executing navigation to node: ${selectedNode.id}`);
      
      const response = await NavigationApi.executeNavigation(
        treeId,
        selectedNode.id,
        currentNodeId,
        true
      );

      if (response.success) {
        let successMessage = 'Navigation completed successfully!';
        
        // Use the new transition/action counts from API (type assertion for new fields)
        const execResponse = response as any;
        if (execResponse.transitions_executed && execResponse.total_transitions) {
          successMessage = `Executed ${execResponse.transitions_executed}/${execResponse.total_transitions} in ${execResponse.execution_time?.toFixed(2) || 0}s`;
        } else if (execResponse.final_message) {
          successMessage = execResponse.final_message;
        }

        setExecutionMessage(successMessage);
        setIsExecuting(false);
        
        // Refresh the step list to show any updates
        await loadNavigationPreview();
      } else {
        const execResponse = response as any;
        const errorMessage = execResponse.error || execResponse.error_message || 'Navigation failed';
        setExecutionMessage(`Navigation failed: ${errorMessage}`);
        setIsExecuting(false);
      }
    } catch (err) {
      let errorMessage = `Navigation execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`;
      
      // Handle network/connection errors
      if (err instanceof Error) {
        if (err.message.includes('fetch')) {
          errorMessage = 'Unable to connect to navigation service. Please check if the backend is running.';
        } else if (err.message.includes('timeout')) {
          errorMessage = 'Navigation request timed out. The operation may take longer than expected.';
        }
      }
      
      setError(errorMessage);
      console.error(`[@component:NodeGotoPanel] Navigation execution error:`, err);
    }
  };

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 360,
        p: 2,
        zIndex: 1000,
      }}
    >
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <RouteIcon color="primary" />
            <Typography variant="h6" sx={{ margin: 0, fontSize: '1.1rem' }}>
              Go To Node
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ p: 0.25 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Node Information - Simplified and more compact */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            Target: {selectedNode.data.label}
          </Typography>
          <Chip 
            label={selectedNode.data.type} 
            size="small" 
            sx={{ fontSize: '0.75rem' }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, mb: 1, fontSize: '0.875rem', color: 'text.secondary' }}>
          <Typography variant="body2">
            <strong>Depth:</strong> {selectedNode.data.depth || 0}
          </Typography>
          <Typography variant="body2">
            <strong>Parent:</strong> {getParentNames(selectedNode.data.parent || [])}
          </Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Navigation Path - More compact */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Path: {getFullPath()}
          </Typography>
        </Box>

        {/* Navigation Steps */}
        <Box sx={{ mb: 1 }}>
          {!isLoadingPreview && navigationSteps.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                Navigation Steps:
              </Typography>
              <Box sx={{ maxHeight: 180, overflowY: 'auto', 
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(0,0,0,0.1)',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(0,0,0,0.3)',
                  borderRadius: '3px',
                  '&:hover': {
                    background: 'rgba(0,0,0,0.5)',
                  }
                }
              }}>
                {navigationSteps.map((transition, index) => {
                  const transitionData = transition as any; // Type assertion for new transition format
                  return (
                  <Box 
                    key={index}
                    sx={{ 
                      mb: 1,
                      p: 1,
                      borderRadius: 1,
                      border: '1px solid',
                      borderColor: 'grey.200'
                    }}
                  >
                    {/* Transition header: "1. ENTRY → home" */}
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '0.875rem' }}>
                      {transitionData.transition_number || index + 1}. {transitionData.from_node_label || 'Start'} → {transitionData.to_node_label || 'Target'}
                    </Typography>
                    
                    {/* Actions for this transition */}
                    {transitionData.actions && transitionData.actions.length > 0 ? (
                      <Box sx={{ ml: 1.5 }}>
                        {transitionData.actions.map((action: any, actionIndex: number) => (
                          <Typography 
                            key={actionIndex}
                            variant="body2" 
                            sx={{ 
                              fontSize: '0.8rem',
                              color: 'text.secondary',
                              mb: 0.25,
                              '&:before': {
                                content: '"- "',
                                fontWeight: 'bold'
                              }
                            }}
                          >
                            {action.label || action.command || 'Unknown Action'}
                            {action.inputValue && ` - ${action.inputValue}`}
                          </Typography>
                        ))}
                      </Box>
                    ) : (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: '0.8rem',
                          color: 'text.secondary',
                          ml: 1.5,
                          fontStyle: 'italic'
                        }}
                      >
                        No actions defined
                      </Typography>
                    )}
                  </Box>
                  );
                })}
              </Box>
            </>
          )}
          
          {!isLoadingPreview && navigationSteps.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No navigation path available
            </Typography>
          )}
          
          {isLoadingPreview && (
            <Typography variant="body2" color="text.secondary">
              Loading navigation steps...
            </Typography>
          )}
        </Box>

        {/* Action Button */}
        <Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={isExecuting ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
            onClick={executeNavigation}
            disabled={!isTakeControlActive || isExecuting}
            fullWidth
            sx={{ fontSize: '0.875rem' }}
          >
            {isExecuting ? 'Executing...' : 'Run'}
          </Button>
          
          {/* Execution Progress */}
          {isExecuting && (
            <Box sx={{ mt: 1 }}>
             
              <LinearProgress />
            </Box>
          )}
        </Box>
         {/* Error Display - Show prominently at the top if there's an error */}
        {error && (
          <Alert severity="error" sx={{ mb: 2, fontSize: '0.875rem' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              Navigation Failed
            </Typography>
            {error}
          </Alert>
        )}

        {/* Success Display */}
        {executionMessage && (
          <Alert severity="success" sx={{ mb: 2, fontSize: '0.875rem' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {executionMessage}
            </Typography>
          </Alert>
        )}
      </Box>
    </Paper>
  );
}; 