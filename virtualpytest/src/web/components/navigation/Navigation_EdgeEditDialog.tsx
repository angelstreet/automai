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
import React, { useState, useEffect, useMemo } from 'react';

import { Host } from '../../types/common/Host_Types';
import type { Actions } from '../../types/controller/ActionTypes';
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

  // Extract controller actions from host data
  const controllerActions: Actions = useMemo(() => {
    return selectedHost?.available_action_types || {};
  }, [selectedHost?.available_action_types]);

  const canRunActions =
    isControlActive && selectedHost && edgeForm?.actions?.length > 0 && !isRunningActions;

  useEffect(() => {
    if (!isOpen) {
      setActionResult(null);
    }
  }, [isOpen]);

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
    return (
      edgeForm?.actions?.every(
        (action) =>
          !action.id || !action.requiresInput || (action.inputValue && action.inputValue.trim()),
      ) ?? true
    );
  };

  const handleRunActions = async () => {
    if (!edgeForm?.actions || edgeForm.actions.length === 0) return;

    if (isRunningActions) {
      console.log(
        '[@component:EdgeEditDialog] Execution already in progress, ignoring duplicate request',
      );
      return;
    }

    setIsRunningActions(true);
    setActionResult(null);
    console.log(
      `[@component:EdgeEditDialog] Starting batch execution of ${edgeForm.actions.length} actions with ${edgeForm?.retryActions?.length || 0} retry actions`,
    );

    try {
      // Use batch execution endpoint (same as verification)
      const response = await fetch('/server/actions/batch/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: selectedHost,
          actions: edgeForm.actions,
          retry_actions: edgeForm?.retryActions || [],
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

        allMessages.push(`📊 Execution results recorded to database`);

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
            actions={edgeForm?.actions || []}
            retryActions={edgeForm?.retryActions || []}
            finalWaitTime={edgeForm?.finalWaitTime || 2000}
            availableActionTypes={controllerActions}
            selectedHost={selectedHost || null}
            onActionsChange={(newActions) => setEdgeForm({ ...edgeForm, actions: newActions })}
            onRetryActionsChange={(newRetryActions) =>
              setEdgeForm({ ...edgeForm, retryActions: newRetryActions })
            }
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
