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

import { useValidation } from '../../hooks/validation';
import ValidationPreviewClient from './ValidationPreviewClient';
import ValidationResultsClient from './ValidationResultsClient';
import ValidationProgressClient from './ValidationProgressClient';

interface ValidationButtonClientProps {
  treeId: string;
  disabled?: boolean;
}

export default function ValidationButtonClient({ treeId, disabled }: ValidationButtonClientProps) {
  const validation = useValidation(treeId);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showPreview, setShowPreview] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (validation.isValidating) return;
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleRunValidation = () => {
    handleClose();
    setShowPreview(true);
    // ValidationPreviewClient will handle loading preview data automatically
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
          <MenuItem
            onClick={() => {
              handleClose();
              validation.setShowResults(true);
            }}
          >
            <ListItemIcon>
              <CheckCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Last Results</ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* Validation Preview Dialog - only show when triggered */}
      {showPreview && (
        <ValidationPreviewClient treeId={treeId} onClose={() => setShowPreview(false)} />
      )}

      {/* Global validation dialogs - these manage their own visibility */}
      {validation.showResults && <ValidationResultsClient treeId={treeId} />}
      {validation.isValidating && <ValidationProgressClient treeId={treeId} />}
    </>
  );
}
