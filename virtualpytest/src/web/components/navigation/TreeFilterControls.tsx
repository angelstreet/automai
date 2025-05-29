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
      <FormControl size="small" sx={{ minWidth: 60 }}>
        <Select
          value={maxDisplayDepth}
          onChange={(e) => onDepthChange(Number(e.target.value))}
          displayEmpty
          sx={{ 
            fontSize: '0.75rem',
            '& .MuiSelect-select': { py: 0.5 }
          }}
        >
          <MenuItem value={1} sx={{ fontSize: '0.75rem' }}>D1</MenuItem>
          <MenuItem value={2} sx={{ fontSize: '0.75rem' }}>D2</MenuItem>
          <MenuItem value={3} sx={{ fontSize: '0.75rem' }}>D3</MenuItem>
          <MenuItem value={4} sx={{ fontSize: '0.75rem' }}>D4</MenuItem>
          <MenuItem value={5} sx={{ fontSize: '0.75rem' }}>D5</MenuItem>
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