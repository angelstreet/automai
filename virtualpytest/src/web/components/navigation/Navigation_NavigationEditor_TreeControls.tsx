import { Box, FormControl, InputLabel, Select, MenuItem, Button, Typography } from '@mui/material';
import React from 'react';

import { NavigationEditorTreeControlsProps } from '../../types/pages/Navigation_Header_Types';

interface TreeNode {
  id: string;
  data?: {
    label?: string;
  };
}

export const NavigationEditorTreeControls: React.FC<NavigationEditorTreeControlsProps> = ({
  focusNodeId,
  availableFocusNodes,
  maxDisplayDepth,
  totalNodes,
  visibleNodes,
  onFocusNodeChange,
  onDepthChange,
  onResetFocus,
}) => {
  // Ensure availableFocusNodes is an array
  const safeNodes = Array.isArray(availableFocusNodes) ? availableFocusNodes : [];

  // Log warning if nodes are not in expected format
  React.useEffect(() => {
    if (safeNodes.some((node) => !node?.id)) {
      console.warn('[@component:NavigationEditorTreeControls] Some nodes are missing ID');
    }
  }, [safeNodes]);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        '& .MuiFormControl-root': {
          minWidth: '70px !important',
          marginRight: '8px',
        },
        '& .MuiButton-root': {
          fontSize: '0.75rem',
          minWidth: 'auto',
          padding: '4px 8px',
        },
        '& .MuiTypography-root': {
          fontSize: '0.75rem',
          whiteSpace: 'nowrap',
        },
      }}
    >
      {/* Focus Node Selection */}
      <FormControl size="small">
        <InputLabel id="focus-node-label">Focus</InputLabel>
        <Select
          labelId="focus-node-label"
          value={focusNodeId || ''}
          onChange={(e) => onFocusNodeChange(e.target.value || null)}
          label="Focus"
          sx={{ height: 32, fontSize: '0.75rem' }}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {safeNodes.map((node: TreeNode) => (
            <MenuItem key={node.id} value={node.id}>
              {node.data?.label || node.id}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Depth Control */}
      <FormControl size="small">
        <InputLabel id="depth-label">Depth</InputLabel>
        <Select
          labelId="depth-label"
          value={maxDisplayDepth}
          onChange={(e) => onDepthChange(Number(e.target.value))}
          label="Depth"
          sx={{ height: 32, fontSize: '0.75rem' }}
        >
          {[...Array(10)].map((_, i) => (
            <MenuItem key={i + 1} value={i + 1}>
              {i + 1}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Reset Focus Button */}
      <Button onClick={onResetFocus} size="small" variant="outlined" sx={{ fontSize: '0.75rem' }}>
        Reset
      </Button>

      {/* Node Count Display */}
      <Typography variant="caption" sx={{ ml: 1 }}>
        {visibleNodes}/{totalNodes} nodes
      </Typography>
    </Box>
  );
};

export default NavigationEditorTreeControls;
