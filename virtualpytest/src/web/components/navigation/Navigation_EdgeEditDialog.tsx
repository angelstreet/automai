import CloseIcon from '@mui/icons-material/Close';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import React, { useEffect, useCallback } from 'react';

import { useEdge } from '../../hooks/navigation/useEdge';
import { Host } from '../../types/common/Host_Types';
import type { Actions } from '../../types/controller/Action_Types';
import { UINavigationEdge, EdgeForm } from '../../types/pages/Navigation_Types';
import { ActionsList } from '../actions';

interface EdgeEditDialogProps {
  isOpen: boolean;
  edgeForm: EdgeForm;
  setEdgeForm: React.Dispatch<React.SetStateAction<EdgeForm>>;
  onSubmit: (formData: any) => void;
  onClose: () => void;
  selectedEdge?: UINavigationEdge | null;
  isControlActive?: boolean;
  selectedHost?: Host | null; // The selected host
  selectedDeviceId?: string | null; // The selected device ID
  availableActions?: Actions; // Pass actions from parent instead of computing them
}

export const EdgeEditDialog: React.FC<EdgeEditDialogProps> = ({
  isOpen,
  edgeForm,
  setEdgeForm,
  onSubmit,
  onClose,
  selectedEdge,
  isControlActive = false,
  selectedHost,
  selectedDeviceId,
  availableActions = {}, // Default to empty object
}) => {
  // Early return if edgeForm is null or undefined - MUST be before any hooks
  if (!edgeForm) {
    return null;
  }

  // Use the consolidated edge hook
  const edgeHook = useEdge({
    selectedHost: selectedHost || null,
    selectedDeviceId,
    isControlActive,
    availableActions,
  });

  // Use availableActions passed from parent (NavigationEditor)
  const controllerActions: Actions = availableActions;

  // Initialize actions from edgeForm when dialog opens
  useEffect(() => {
    if (isOpen && edgeForm) {
      console.log(`[@component:EdgeEditDialog] Initializing actions from edgeForm`);
      edgeHook.initializeActions(edgeForm);
    }
  }, [isOpen, edgeForm, edgeHook]);

  useEffect(() => {
    if (!isOpen) {
      edgeHook.resetDialogState();
    }
  }, [isOpen, edgeHook]);

  // Handle action changes using hook functions
  const handleActionsChange = useCallback(
    (newActions: any[]) => {
      edgeHook.handleActionsChange(newActions, edgeForm, setEdgeForm);
    },
    [edgeForm, edgeHook, setEdgeForm],
  );

  const handleRetryActionsChange = useCallback(
    (newRetryActions: any[]) => {
      edgeHook.handleRetryActionsChange(newRetryActions, edgeForm, setEdgeForm);
    },
    [edgeForm, edgeHook, setEdgeForm],
  );

  useEffect(() => {
    if (isOpen) {
      console.log('[@component:EdgeEditDialog] Dialog opened with available actions:', {
        hostName: selectedHost?.host_name,
        deviceId: selectedDeviceId,
        availableActionsCount: Object.keys(controllerActions).length,
        actionCategories: Object.keys(controllerActions),
      });

      if (Object.keys(controllerActions).length === 0) {
        console.log('[@component:EdgeEditDialog] No actions available - control may not be active');
      }
    }
  }, [isOpen, selectedHost, selectedDeviceId, controllerActions]);

  const handleRunActions = async () => {
    await edgeHook.executeLocalActions(edgeForm);
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Navigation Actions
          <IconButton size="small" onClick={onClose} sx={{ p: 0.25 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="From"
              value={selectedEdge?.data?.from || ''}
              InputProps={{ readOnly: true }}
              fullWidth
              variant="outlined"
              size="small"
            />
            <TextField
              label="To"
              value={selectedEdge?.data?.to || ''}
              InputProps={{ readOnly: true }}
              fullWidth
              variant="outlined"
              size="small"
            />
          </Box>

          <TextField
            label="Edge Description"
            value={edgeForm?.description || ''}
            onChange={(e) => setEdgeForm({ ...edgeForm, description: e.target.value })}
            fullWidth
            size="small"
          />

          <ActionsList
            actions={edgeHook.localActions}
            retryActions={edgeHook.localRetryActions}
            finalWaitTime={edgeForm?.finalWaitTime || 2000}
            availableActionTypes={controllerActions}
            selectedHost={selectedHost || null}
            onActionsChange={handleActionsChange}
            onRetryActionsChange={handleRetryActionsChange}
            onFinalWaitTimeChange={(finalWaitTime) => setEdgeForm({ ...edgeForm, finalWaitTime })}
          />

          {edgeHook.actionResult && (
            <Box
              sx={{
                p: 2,
                bgcolor: edgeHook.actionResult.includes('❌ OVERALL RESULT: FAILED')
                  ? 'error.light'
                  : edgeHook.actionResult.includes('✅ OVERALL RESULT: SUCCESS')
                    ? 'success.light'
                    : edgeHook.actionResult.includes('❌') && !edgeHook.actionResult.includes('✅')
                      ? 'error.light'
                      : edgeHook.actionResult.includes('⚠️')
                        ? 'warning.light'
                        : 'success.light',
                borderRadius: 1,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {edgeHook.actionResult}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => onSubmit(edgeForm)}
          variant="contained"
          disabled={!edgeHook.isFormValid()}
        >
          Save
        </Button>
        <Button
          onClick={handleRunActions}
          variant="contained"
          disabled={!edgeHook.canRunLocalActions()}
          sx={{ opacity: !edgeHook.canRunLocalActions() ? 0.5 : 1 }}
        >
          {edgeHook.actionHook.loading ? 'Running...' : 'Run'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
