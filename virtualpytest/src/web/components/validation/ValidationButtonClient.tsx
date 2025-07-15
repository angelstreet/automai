'use client';

import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import React, { useState } from 'react';

import { useValidationUI } from '../../hooks/validation';

interface ValidationButtonClientProps {
  treeId: string;
  disabled?: boolean;
}

export default function ValidationButtonClient({ treeId, disabled }: ValidationButtonClientProps) {
  const validation = useValidationUI(treeId);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (validation.isValidating) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleRunValidation = () => {
    handleClose();
    validation.loadPreview(); // This will show the validation preview dialog
  };

  const handleViewResults = () => {
    handleClose();
    // Results are automatically shown when validation completes
    // If we need to show previous results, we can add that functionality
  };

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        onClick={handleClick}
        disabled={disabled || validation.isValidating || !validation.canRunValidation}
        endIcon={validation.isValidating ? <CircularProgress size={16} /> : <ExpandMoreIcon />}
        sx={{ minWidth: 120 }}
      >
        {validation.isValidating ? 'Validating...' : 'Validate'}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
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
            <CheckCircleIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Run Validation</ListItemText>
        </MenuItem>

        {validation.hasResults && (
          <MenuItem onClick={handleViewResults}>
            <ListItemIcon>
              <CheckCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Last Results</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
