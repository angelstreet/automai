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
import { UINavigationNode } from '../../types/pages/Navigation_Types';
import { NavigationStep, NavigationPreviewResponse, NavigationExecuteResponse } from '../../utils/navigation/navigationUtils';

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
  const [error, setError] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<string | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Calculate confidence score from last run results (0-1 scale)
  const calculateConfidenceScore = (results?: boolean[]): number => {
    if (!results || results.length === 0) return 0.5; // Default confidence for new verifications
    const successCount = results.filter(result => result).length;
    return successCount / results.length;
  };

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
  }, [treeId, selectedNode.id, currentNodeId]);

  const loadNavigationPreview = async () => {
    setIsLoadingPreview(true);
    setError(null);

    try {
      console.log(`[@component:NodeGotoPanel] Loading navigation preview for node: ${selectedNode.id}`);
      
      // Use relative URL that goes through Vite proxy
      const url = new URL(`/server/navigation/preview/${treeId}/${selectedNode.id}`, window.location.origin);
      if (currentNodeId) {
        url.searchParams.append('current_node_id', currentNodeId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: NavigationPreviewResponse = await response.json();

      if (result.success) {
        setNavigationSteps(result.steps);
        console.log(`[@component:NodeGotoPanel] Loaded ${result.total_steps} navigation steps`);
      } else {
        setError(result.error || 'Failed to load navigation preview');
      }
    } catch (err) {
      setError(`Failed to load navigation preview: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const executeNavigation = async () => {
    setIsExecuting(true);
    setError(null);
    setExecutionResult(null);

    try {
      console.log(`[@component:NodeGotoPanel] Executing navigation to node: ${selectedNode.id}`);
      
      // Use relative URL that goes through Vite proxy
      const response = await fetch(`/server/navigation/navigate/${treeId}/${selectedNode.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_node_id: currentNodeId,
          execute: true,
        }),
      });

      const result: NavigationExecuteResponse = await response.json();

      if (result.success) {
        let successMessage = 'Navigation completed successfully!';
        
        // Use the new step counts from API
        if (result.steps_executed && result.total_steps) {
          successMessage = `Executed ${result.steps_executed}/${result.total_steps} steps in ${result.execution_time?.toFixed(2) || 0}s`;
        }

        setExecutionMessage(successMessage);
        setIsExecuting(false);
        
        // Refresh the step list to show any updates
        await loadNavigationPreview();
      } else {
        const errorMessage = result.error || 'Navigation failed';
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
        height: 'calc(100vh - 180px)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header - Fixed at top */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        p: 2, 
        pb: 1,
        flexShrink: 0,
      }}>
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
      <Box sx={{ 
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
          }
        }
      }}>
        {/* Error Display */}
        {error && (
          <Alert 
            severity="error" 
            icon={<ErrorIcon />}
            sx={{ 
              mb: 1, 
              fontSize: '0.875rem',
              color: 'error.main',
              backgroundColor: 'error.light',
              '& .MuiAlert-icon': {
                color: 'error.main'
              }
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5, color: 'error.main' }}>
              Navigation Failed
            </Typography>
            <Typography variant="body2" sx={{ color: 'error.main' }}>
              {error}
            </Typography>
          </Alert>
        )}

        {/* Node Information */}
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
        
        <Box sx={{ display: 'flex', gap: 2, mb: 0.5, fontSize: '0.875rem', color: 'text.secondary' }}>
          <Typography variant="body2">
            <strong>Depth:</strong> {selectedNode.data.depth || 0}
          </Typography>
          <Typography variant="body2">
            <strong>Parent:</strong> {getParentNames(selectedNode.data.parent || [])}
          </Typography>
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Navigation Path */}
        <Box sx={{ mb: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Path: {getFullPath()}
          </Typography>
        </Box>

        {/* Navigation Steps */}
        <Box sx={{ 
          mb: 0.5,
          border: '1px solid',
          borderColor: 'grey.300',
          borderRadius: 1,
          p: 1
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0 }}>
            Navigation Steps:
          </Typography>
          
          {!isLoadingPreview && navigationSteps.length > 0 && (
            <Box>
              {navigationSteps.map((transition, index) => {
                const transitionData = transition as any;
                return (
                <Box 
                  key={index}
                  sx={{ 
                    mb: 0,
                    p: 0.5,
                    borderRadius: 1,
                    '&:last-child': { mb: 0 }
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '0.875rem' }}>
                    {transitionData.transition_number || index + 1}. {transitionData.from_node_label || 'Start'} → {transitionData.to_node_label || 'Target'}
                  </Typography>
                  
                  {transitionData.actions && transitionData.actions.length > 0 ? (
                    <Box sx={{ ml: 1.5 }}>
                      {transitionData.actions.map((action: any, actionIndex: number) => (
                        <Typography 
                          key={actionIndex}
                          variant="body2" 
                          sx={{ 
                            fontSize: '0.8rem',
                            color: 'text.secondary',
                            mb: 0,
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

        {/* Node Verifications */}
        <Box sx={{
          border: '1px solid',
          borderColor: 'grey.300',
          borderRadius: 1,
          p: 1
        }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0 }}>
            Verifications:
          </Typography>
          
          {selectedNode.data.verifications && selectedNode.data.verifications.length > 0 ? (
            <Box>
              {selectedNode.data.verifications.map((verification, index) => (
                <Box 
                  key={verification.id || index}
                  sx={{ 
                    mb: 0,
                    p: 0.5,
                
                    '&:last-child': { mb: 0 }
                  }}
                >
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5, fontSize: '0.875rem' }}>
                    {index + 1}. {verification.label || 'Unnamed Verification'}
                  </Typography>
                  
                  <Box sx={{ ml: 1.5 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: '0.8rem',
                        color: 'text.secondary',
                        mb: 0.25
                      }}
                    >
                      <strong>Command:</strong> {verification.command || 'No command'}
                    </Typography>
                    
                    {(verification as any).inputValue && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontSize: '0.8rem',
                          color: 'primary.main',
                          fontWeight: 'bold'
                        }}
                      >
                        Input: {(verification as any).inputValue}
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
      <Box sx={{ 
        flexShrink: 0, 
        p: 1,
        
      }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={isExecuting ? <CircularProgress size={16} color="inherit" /> : <PlayArrowIcon />}
          onClick={executeNavigation}
          disabled={isExecuting}
          fullWidth
          sx={{ fontSize: '0.875rem' }}
        >
          {isExecuting ? 'Executing...' : 'Run'}
        </Button>
        
        {isExecuting && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress />
          </Box>
        )}
        
        {/* Success Display */}
        {executionMessage && (
          <Alert severity="success" sx={{ mt: 0.5, fontSize: '0.875rem' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {executionMessage}
            </Typography>
          </Alert>
        )}
      </Box>
    </Paper>
  );
}; 