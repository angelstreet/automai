import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';

interface TreeFilterControlsProps {
  // Focus node selection
  focusNodeId: string | null;
  availableFocusNodes: { id: string; label: string; depth: number }[];
  onFocusNodeChange: (nodeId: string | null) => void;
  
  // Depth selection
  maxDisplayDepth: number;
  onDepthChange: (depth: number) => void;
  
  // Reset functionality
  onResetFocus: () => void;
  
  // Statistics
  totalNodes: number;
  visibleNodes: number;
}

export const TreeFilterControls: React.FC<TreeFilterControlsProps> = ({
  focusNodeId,
  availableFocusNodes,
  onFocusNodeChange,
  maxDisplayDepth,
  onDepthChange,
  onResetFocus,
  totalNodes,
  visibleNodes,
}) => {
  const getFocusNodeLabel = () => {
    if (!focusNodeId) return 'All';
    const node = availableFocusNodes.find(n => n.id === focusNodeId);
    return node ? node.label : 'All';
  };

  const getDepthLabel = () => {
    return `D${maxDisplayDepth}`;
  };

  // Get the focus node's depth for calculating dynamic labels
  const focusNodeDepth = focusNodeId 
    ? availableFocusNodes.find(n => n.id === focusNodeId)?.depth || 0 
    : 0;

  // Generate dynamic depth menu items
  const generateDepthMenuItems = () => {
    const items = [];
    for (let i = 1; i <= 5; i++) {
      items.push(
        <MenuItem key={i} value={i} sx={{ fontSize: '0.75rem' }}>
          D{i}
        </MenuItem>
      );
    }
    return items;
  };

  // Check if filter is currently active
  const isFilterActive = focusNodeId !== null;

  return (
    <Box sx={{ 
      display: 'grid',
      gridTemplateColumns: '80px 80px 60px 80px 120px 150px',
      alignItems: 'center',
      gap: 1,
      minWidth: '570px'
    }}>
      {/* Node Selection */}
      <Tooltip title="Focus on specific node or show all nodes">
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel sx={{ fontSize: '0.75rem' }}>Node</InputLabel>
          <Select
            value={focusNodeId || 'all'}
            label="Node"
            onChange={(e) => onFocusNodeChange(e.target.value === 'all' ? null : e.target.value)}
            sx={{ 
              fontSize: '0.75rem',
              '& .MuiSelect-select': { py: 0.5 },
              ...(isFilterActive && {
                backgroundColor: 'action.selected',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'primary.main',
                  borderWidth: 2,
                }
              })
            }}
          >
            <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>All</MenuItem>
            {availableFocusNodes.map((node) => (
              <MenuItem key={node.id} value={node.id} sx={{ fontSize: '0.75rem' }}>
                {node.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Tooltip>

      {/* Depth Selection */}
      <Tooltip title="Set maximum depth to display">
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <Select
            value={maxDisplayDepth}
            onChange={(e) => onDepthChange(Number(e.target.value))}
            displayEmpty
            sx={{ 
              fontSize: '0.75rem',
              '& .MuiSelect-select': { py: 0.5 }
            }}
          >
            {generateDepthMenuItems()}
          </Select>
        </FormControl>
      </Tooltip>

      {/* Reset Button */}
      <Tooltip title="Reset filter to show all nodes (or double-click any node when filter is active)">
        <Button
          variant={isFilterActive ? "contained" : "outlined"}
          size="small"
          onClick={onResetFocus}
          sx={{ 
            minWidth: 'auto',
            px: 1,
            fontSize: '0.7rem',
            textTransform: 'none',
            ...(isFilterActive && {
              backgroundColor: 'warning.main',
              color: 'warning.contrastText',
              '&:hover': {
                backgroundColor: 'warning.dark',
              }
            })
          }}
        >
          Reset
        </Button>
      </Tooltip>

      {/* Node Statistics - Fixed width container */}
      <Box sx={{ minWidth: 20 }}>
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '0.7rem',
            color: isFilterActive ? 'primary.main' : 'text.secondary',
            fontWeight: isFilterActive ? 'bold' : 'normal',
          }}
        >
          {visibleNodes}/{totalNodes} nodes
        </Typography>
      </Box>
           {/* Filter Status Indicator - Fixed width container */}
      <Box sx={{ minWidth: 20 }}>
        {isFilterActive && (
          <Chip
            label="Filtered"
            size="small"
            color="primary"
            variant="outlined"
            sx={{ 
              fontSize: '0.65rem',
              height: 20,
            }}
          />
        )}
      </Box>
    </Box>
  );
}; 