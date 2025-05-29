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

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Node Selection */}
      <FormControl size="small" sx={{ minWidth: 80 }}>
        <InputLabel sx={{ fontSize: '0.75rem' }}>Node</InputLabel>
        <Select
          value={focusNodeId || 'all'}
          label="Node"
          onChange={(e) => onFocusNodeChange(e.target.value === 'all' ? null : e.target.value)}
          sx={{ 
            fontSize: '0.75rem',
            '& .MuiSelect-select': { py: 0.5 }
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

      {/* Depth Selection */}
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

      {/* Reset Button */}
      <Button
        variant="outlined"
        size="small"
        onClick={onResetFocus}
        sx={{ 
          minWidth: 'auto',
          px: 1,
          fontSize: '0.7rem',
          textTransform: 'none'
        }}
      >
        Reset
      </Button>

      {/* Node Statistics */}
      <Typography 
        variant="caption" 
        sx={{ 
          fontSize: '0.7rem',
          color: 'text.secondary',
          ml: 1
        }}
      >
        {visibleNodes}/{totalNodes} nodes
      </Typography>
    </Box>
  );
}; 