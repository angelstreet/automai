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
        setExecutionResult(
          `Navigation completed successfully! Executed ${response.steps_executed}/${response.total_steps} steps in ${response.execution_time.toFixed(2)}s`
        );
        console.log(`[@component:NodeGotoPanel] Navigation execution completed successfully`);
      } else {
        setError(response.error || 'Navigation execution failed');
      }
    } catch (err) {
      setError(`Navigation execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Paper
      sx={{
        position: 'absolute',
        top: 16,
        right: 16,
        width: 300,
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
            Navigation Path:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {getFullPath()}
          </Typography>
        </Box>

        {/* Navigation Steps */}
        <Box sx={{ mb: 1 }}>
        
  
         
          {!isLoadingPreview && navigationSteps.length > 0 && (
            <Box sx={{ maxHeight: 120 }}>
              {navigationSteps.map((step, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    py: 0.5,
                    fontSize: '0.8rem'
                  }}
                >
                  <Typography variant="body2">
                    Step {step.step_number}: {step.action} - {step.from_node_label} → {step.to_node_label}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          {!isLoadingPreview && navigationSteps.length === 0 && !error && (
            <Typography variant="body2" color="text.secondary">
              
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
        </Box>
         {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mb: 1, fontSize: '0.875rem' }}>
            {error}
          </Alert>
        )}

        {/* Success Display */}
        {executionResult && (
          <Alert severity="success" sx={{ mb: 1, fontSize: '0.875rem' }}>
            {executionResult}
          </Alert>
        )}

        {/* Execution Progress */}
        {isExecuting && (
          <Box sx={{ mb: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Executing navigation...
            </Typography>
            <LinearProgress />
          </Box>
        )}
      </Box>
    </Paper>
  );
}; 