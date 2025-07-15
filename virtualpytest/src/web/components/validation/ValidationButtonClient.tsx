'use client';

import {
  CheckCircle as CheckCircleIcon,
  ArrowDropDown as ArrowDropDownIcon,
  PlayArrow as PlayArrowIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import {
  Button,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
} from '@mui/material';
import { useState } from 'react';

import { useHostManager } from '../../hooks/useHostManager';
import { useValidationUI } from '../../hooks/validation';

interface ValidationButtonClientProps {
  treeId: string;
  disabled?: boolean;
}

export default function ValidationButtonClient({ treeId, disabled }: ValidationButtonClientProps) {
  const { selectedHost, selectedDeviceId } = useHostManager();
  const validation = useValidationUI(treeId, selectedHost, selectedDeviceId);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const getButtonColor = () => {
    if (!validation.results) return 'primary';

    switch (validation.results.summary.overallHealth) {
      case 'excellent':
        return 'success';
      case 'poor':
        return 'error';
      case 'fair':
        return 'warning';
      default:
        return 'primary';
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    if (validation.lastResult && !validation.isValidating) {
      // If there's a cached result and not validating, show dropdown
      setAnchorEl(event.currentTarget);
    } else {
      // Otherwise, just open preview directly
      console.log(
        `[@component:ValidationButtonClient] Validation button clicked for tree: ${treeId}`,
      );
      validation.openPreview();
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleRunValidation = () => {
    console.log(`[@component:ValidationButtonClient] Run validation clicked for tree: ${treeId}`);
    handleClose();
    validation.openPreview();
  };

  const handleViewLastResult = () => {
    console.log(`[@component:ValidationButtonClient] View last result clicked for tree: ${treeId}`);
    handleClose();
    validation.viewLastResult();
  };

  // If there's a cached result and not validating, show dropdown button
  const showDropdown = validation.lastResult && !validation.isValidating;

  return (
    <Box display="inline-flex">
      <Button
        startIcon={validation.isValidating ? <CircularProgress size={16} /> : <CheckCircleIcon />}
        endIcon={showDropdown ? <ArrowDropDownIcon /> : undefined}
        onClick={handleClick}
        size="small"
        disabled={disabled || validation.isValidating}
        variant="outlined"
        color={getButtonColor()}
        sx={{
          minWidth: 'auto',
          whiteSpace: 'nowrap',
          fontSize: '0.75rem',
        }}
      >
        Validate
      </Button>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <MenuItem onClick={handleRunValidation}>
          <ListItemIcon>
            <PlayArrowIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Run Validation" />
        </MenuItem>
        <MenuItem onClick={handleViewLastResult}>
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Last Result" />
        </MenuItem>
      </Menu>
    </Box>
  );
}
