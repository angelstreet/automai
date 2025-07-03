import {
  Add as AddIcon,
  FitScreen as FitScreenIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { Box, Button, IconButton, CircularProgress } from '@mui/material';
import React from 'react';

import { NavigationEditorActionButtonsProps } from '../../types/pages/NavigationHeader_Types';
import { ValidationButtonClient } from '../validation';

export const NavigationEditorActionButtons: React.FC<NavigationEditorActionButtonsProps> = ({
  treeId,
  isLocked,
  hasUnsavedChanges,
  isLoading,
  error,
  selectedHost,
  selectedDeviceId,
  isControlActive,
  onAddNewNode,
  onFitView,
  onSaveToConfig,
  onDiscardChanges,
}) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        minWidth: 0,
      }}
    >
      {/* Validation Button */}
      <ValidationButtonClient
        treeId={treeId}
        disabled={isLoading || !!error || !selectedHost || !selectedDeviceId || !isControlActive}
      />

      {/* Add Node Button */}
      <Button
        startIcon={<AddIcon />}
        onClick={() => onAddNewNode('screen', { x: 250, y: 250 })}
        size="small"
        disabled={isLoading || !!error || !isLocked}
        variant="outlined"
        sx={{
          minWidth: 'auto',
          whiteSpace: 'nowrap',
          fontSize: '0.75rem',
        }}
        title={!isLocked ? 'Cannot add nodes - tree is in read-only mode' : 'Add Node'}
      >
        Add&nbsp;Node
      </Button>

      {/* Fit View Button */}
      <IconButton onClick={onFitView} size="small" title="Fit View" disabled={isLoading || !!error}>
        <FitScreenIcon />
      </IconButton>

      {/* Save Button */}
      <IconButton
        onClick={onSaveToConfig}
        size="small"
        title={
          !isLocked
            ? 'Cannot save - tree is in read-only mode'
            : hasUnsavedChanges
              ? 'Save Changes to Config'
              : 'Save to Config'
        }
        disabled={isLoading || !!error || !isLocked}
        color={hasUnsavedChanges ? 'primary' : 'default'}
      >
        {isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
      </IconButton>

      {/* Discard Changes Button */}
      <IconButton
        onClick={onDiscardChanges}
        size="small"
        title={hasUnsavedChanges ? 'Discard Unsaved Changes' : 'Discard Changes'}
        color={hasUnsavedChanges ? 'warning' : 'default'}
        disabled={isLoading || !!error}
      >
        <CancelIcon />
      </IconButton>
    </Box>
  );
};

export default NavigationEditorActionButtons;
