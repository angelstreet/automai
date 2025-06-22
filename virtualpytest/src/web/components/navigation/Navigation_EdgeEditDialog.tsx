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
  selectedHost?: Host; // Make optional so dialog can be rendered without host
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
}) => {
  // Early return if edgeForm is null or undefined - MUST be before any hooks
  if (!edgeForm) {
    return null;
  }

  const [isRunningActions, setIsRunningActions] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);

  // Local state for actions to mirror verification pattern
  const [localActions, setLocalActions] = useState<EdgeAction[]>([]);
  const [localRetryActions, setLocalRetryActions] = useState<EdgeAction[]>([]);

  // Extract controller actions from host data
  const controllerActions: Actions = useMemo(() => {
    return selectedHost?.available_action_types || {};
  }, [selectedHost?.available_action_types]);

  const canRunActions =
    isControlActive && selectedHost && localActions.length > 0 && !isRunningActions;

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
      console.log('[@component:EdgeEditDialog] Dialog opened with host:', {
        hostName: selectedHost?.host_name,
        deviceModel: selectedHost?.device_model,
        availableActionsCount: Object.keys(controllerActions).length,
      });

      if (Object.keys(controllerActions).length === 0) {
        console.log('[@component:EdgeEditDialog] No remote actions available in host data');
      }
    }
  }, [isOpen, selectedHost, controllerActions]);

  const isFormValid = () => {
    return localActions.every(
      (action) =>
        !action.id || !action.requiresInput || (action.inputValue && action.inputValue.trim()),
    );
  };

  const handleRunActions = async () => {
    if (!localActions || localActions.length === 0) return;

    if (isRunningActions) {
      console.log(
        '[@component:EdgeEditDialog] Execution already in progress, ignoring duplicate request',
      );
      return;
    }

    setIsRunningActions(true);
    setActionResult(null);
    console.log(
      `[@component:EdgeEditDialog] Starting batch execution of ${localActions.length} actions with ${localRetryActions.length} retry actions`,
    );

    try {
      // Use batch execution endpoint (same as verification)
      const response = await fetch('/server/actions/batch/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: selectedHost,
          actions: localActions,
          retry_actions: localRetryActions,
          final_wait_time: edgeForm?.finalWaitTime || 2000,
        }),
      });

      const result = await response.json();
      console.log('[@component:EdgeEditDialog] Batch execution result:', result);

      // Process results (same format as verification)
      if (result.success !== undefined) {
        const successMessages =
          result.results?.filter((r: any) => r.success).map((r: any) => `✅ ${r.message}`) || [];

        const failMessages =
          result.results
            ?.filter((r: any) => !r.success)
            .map((r: any) => `❌ ${r.message}${r.error ? `: ${r.error}` : ''}`) || [];

        const allMessages = [...successMessages, ...failMessages];
        allMessages.push(''); // Empty line

        if (result.success) {
          allMessages.push(`✅ OVERALL RESULT: SUCCESS`);
          allMessages.push(`📊 ${result.passed_count}/${result.total_count} actions passed`);
        } else {
          allMessages.push(`❌ OVERALL RESULT: FAILED`);
          allMessages.push(`📊 ${result.passed_count}/${result.total_count} actions passed`);
        }

        setActionResult(allMessages.join('\n'));
      } else {
        setActionResult(`❌ Batch execution failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error('[@component:EdgeEditDialog] Error executing actions:', err);
      setActionResult(`❌ Network error: ${err.message}`);
    } finally {
      setIsRunningActions(false);
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
          {isRunningActions ? 'Running...' : 'Run'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
