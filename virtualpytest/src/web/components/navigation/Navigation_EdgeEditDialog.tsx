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
import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { useAction } from '../../hooks/actions';
import { Host } from '../../types/common/Host_Types';
import type { Actions, EdgeAction } from '../../types/controller/ActionTypes';
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
}) => {
  // Early return if edgeForm is null or undefined - MUST be before any hooks
  if (!edgeForm) {
    return null;
  }

  // Use centralized action hook
  const actionHook = useAction({
    selectedHost: selectedHost || null,
    deviceId: selectedDeviceId,
  });

  // Local state for actions to mirror verification pattern
  const [localActions, setLocalActions] = useState<EdgeAction[]>([]);
  const [localRetryActions, setLocalRetryActions] = useState<EdgeAction[]>([]);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // Extract controller actions from selected device data and flatten the structure
  const controllerActions: Actions = useMemo(() => {
    // Get actions from the selected device
    const device = selectedHost?.devices?.find((d) => d.device_id === selectedDeviceId);
    if (!device) {
      console.log('[@component:EdgeEditDialog] No device selected');
      return {};
    }

    const rawActions = device.device_action_types || {};
    console.log('[@component:EdgeEditDialog] Raw device_action_types from device:', rawActions);
    console.log(
      '[@component:EdgeEditDialog] Available action types keys:',
      Object.keys(rawActions),
    );

    // Flatten the action structure from controller-based to category-based
    // Transform from: { "action_remote_android": { "remote": [...], "control": [...] } }
    // To: { "remote": [...], "control": [...] }
    const flattenedActions: Actions = {};

    for (const [_controllerKey, controllerData] of Object.entries(rawActions)) {
      if (controllerData && typeof controllerData === 'object') {
        for (const [category, categoryActions] of Object.entries(controllerData)) {
          if (Array.isArray(categoryActions)) {
            // Merge actions from multiple controllers into the same category
            if (!flattenedActions[category]) {
              flattenedActions[category] = [];
            }
            flattenedActions[category] = [...flattenedActions[category], ...categoryActions];
          }
        }
      }
    }

    console.log('[@component:EdgeEditDialog] Flattened actions structure:', flattenedActions);
    console.log(
      '[@component:EdgeEditDialog] Flattened action categories:',
      Object.keys(flattenedActions),
    );
    console.log(
      '[@component:EdgeEditDialog] Total action count:',
      Object.values(flattenedActions).reduce(
        (sum, actions) => sum + (Array.isArray(actions) ? actions.length : 0),
        0,
      ),
    );

    return flattenedActions;
  }, [selectedHost?.devices, selectedDeviceId]);

  const canRunActions =
    isControlActive && selectedHost && localActions.length > 0 && !actionHook.loading;

  // Initialize actions from edgeForm when dialog opens (mirrors verification pattern)
  useEffect(() => {
    if (isOpen && edgeForm?.actions) {
      console.log(
        `[@component:EdgeEditDialog] Initializing actions from edgeForm:`,
        edgeForm.actions,
      );
      setLocalActions(edgeForm.actions);
    }
    if (isOpen && edgeForm?.retryActions) {
      console.log(
        `[@component:EdgeEditDialog] Initializing retry actions from edgeForm:`,
        edgeForm.retryActions,
      );
      setLocalRetryActions(edgeForm.retryActions);
    }
  }, [isOpen, edgeForm?.actions, edgeForm?.retryActions]);

  useEffect(() => {
    if (!isOpen) {
      setActionResult(null);
    }
  }, [isOpen]);

  // Handle action changes by creating custom handlers that update both local state AND edgeForm (mirrors verification pattern)
  const handleActionsChange = useCallback(
    (newActions: EdgeAction[]) => {
      console.log(`[@component:EdgeEditDialog] Updating edgeForm with new actions:`, newActions);

      // Update both local state and edgeForm
      setLocalActions(newActions);
      setEdgeForm({
        ...edgeForm,
        actions: newActions,
      });
    },
    [edgeForm, setEdgeForm],
  );

  const handleRetryActionsChange = useCallback(
    (newRetryActions: EdgeAction[]) => {
      console.log(
        `[@component:EdgeEditDialog] Updating edgeForm with new retry actions:`,
        newRetryActions,
      );

      // Update both local state and edgeForm
      setLocalRetryActions(newRetryActions);
      setEdgeForm({
        ...edgeForm,
        retryActions: newRetryActions,
      });
    },
    [edgeForm, setEdgeForm],
  );

  useEffect(() => {
    if (isOpen) {
      console.log('[@component:EdgeEditDialog] Dialog opened with device:', {
        hostName: selectedHost?.host_name,
        deviceId: selectedDeviceId,
        availableActionsCount: Object.keys(controllerActions).length,
      });

      if (Object.keys(controllerActions).length === 0) {
        console.log('[@component:EdgeEditDialog] No remote actions available in device data');
      }
    }
  }, [isOpen, selectedHost, selectedDeviceId, controllerActions]);

  const isFormValid = () => {
    return localActions.every(
      (action) =>
        !action.id || !action.requiresInput || (action.inputValue && action.inputValue.trim()),
    );
  };

  const handleRunActions = async () => {
    if (!localActions || localActions.length === 0) return;

    if (actionHook.loading) {
      console.log(
        '[@component:EdgeEditDialog] Execution already in progress, ignoring duplicate request',
      );
      return;
    }

    setActionResult(null);
    console.log(
      `[@component:EdgeEditDialog] Starting batch execution of ${localActions.length} actions with ${localRetryActions.length} retry actions`,
    );

    try {
      const result = await actionHook.executeActions(
        localActions,
        localRetryActions,
        edgeForm?.finalWaitTime || 2000,
      );

      // Format the result for display
      const formattedResult = actionHook.formatExecutionResults(result);
      setActionResult(formattedResult);
    } catch (err: any) {
      console.error('[@component:EdgeEditDialog] Error executing actions:', err);
      setActionResult(`❌ Network error: ${err.message}`);
    }
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
            actions={localActions}
            retryActions={localRetryActions}
            finalWaitTime={edgeForm?.finalWaitTime || 2000}
            availableActionTypes={controllerActions}
            selectedHost={selectedHost || null}
            onActionsChange={handleActionsChange}
            onRetryActionsChange={handleRetryActionsChange}
            onFinalWaitTimeChange={(finalWaitTime) => setEdgeForm({ ...edgeForm, finalWaitTime })}
          />

          {actionResult && (
            <Box
              sx={{
                p: 2,
                bgcolor: actionResult.includes('❌ OVERALL RESULT: FAILED')
                  ? 'error.light'
                  : actionResult.includes('✅ OVERALL RESULT: SUCCESS')
                    ? 'success.light'
                    : actionResult.includes('❌') && !actionResult.includes('✅')
                      ? 'error.light'
                      : actionResult.includes('⚠️')
                        ? 'warning.light'
                        : 'success.light',
                borderRadius: 1,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {actionResult}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onSubmit(edgeForm)} variant="contained" disabled={!isFormValid()}>
          Save
        </Button>
        <Button
          onClick={handleRunActions}
          variant="contained"
          disabled={!canRunActions}
          sx={{ opacity: !canRunActions ? 0.5 : 1 }}
        >
          {actionHook.loading ? 'Running...' : 'Run'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
