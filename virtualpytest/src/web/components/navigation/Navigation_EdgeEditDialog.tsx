import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
} from '@mui/material';
import React, { useState, useEffect, useMemo } from 'react';

import { Host } from '../../types/common/Host_Types';
import { UINavigationEdge, EdgeForm } from '../../types/pages/Navigation_Types';
import { executeEdgeActions } from '../../utils/navigation/navigationUtils';

import { EdgeActionsList } from './Navigation_EdgeActionsList';

interface ControllerAction {
  id: string;
  label: string;
  command: string;
  params: any;
  description: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

interface ControllerActions {
  [category: string]: ControllerAction[];
}

interface EdgeEditDialogProps {
  isOpen: boolean;
  edgeForm: EdgeForm;
  setEdgeForm: React.Dispatch<React.SetStateAction<EdgeForm>>;
  onSubmit: (formData: any) => void;
  onClose: () => void;
  selectedEdge?: UINavigationEdge | null;
  isControlActive?: boolean;
  selectedHost: Host; // Use proper Host type and make required
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
  const controllerActions: ControllerActions = useMemo(() => {
    return selectedHost?.available_remote_actions || {};
  }, [selectedHost?.available_remote_actions]);

  // Extract controller types from device model
  const getControllerTypes = (): string[] => {
    const deviceModel = selectedHost?.device_model;
    if (!deviceModel) return [];

    // Map device models to controller types
    const modelToControllerMap: { [key: string]: string[] } = {
      android_mobile: ['android_mobile'],
      android_tv: ['android_tv'],
      stb: ['stb'],
    };

    return modelToControllerMap[deviceModel] || [];
  };

  const controllerTypes = getControllerTypes();
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
        controllerTypes,
        availableActionsCount: Object.keys(controllerActions).length,
      });

      if (Object.keys(controllerActions).length === 0) {
        console.log('[@component:EdgeEditDialog] No remote actions available in host data');
      }
    }
  }, [isOpen, selectedHost, controllerActions, controllerTypes]);

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
      `[@component:EdgeEditDialog] Starting execution of ${edgeForm.actions.length} actions with ${edgeForm?.retryActions?.length || 0} retry actions`,
    );

    try {
      const result = await executeEdgeActions(
        edgeForm.actions,
        controllerTypes,
        selectedHost,
        undefined,
        edgeForm?.finalWaitTime,
        edgeForm?.retryActions,
        undefined,
      );

      // Update the edge form with the updated actions
      setEdgeForm((prev) => ({
        ...prev,
        actions: result.updatedActions,
        retryActions: result.updatedRetryActions || prev?.retryActions || [],
      }));

      setActionResult(result.results.join('\n'));
    } catch (err: any) {
      console.error('[@component:EdgeEditDialog] Error executing actions:', err);
      setActionResult(`❌ ${err.message}`);
    } finally {
      setIsRunningActions(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Navigation Actions</DialogTitle>
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

          <EdgeActionsList
            actions={edgeForm?.actions || []}
            retryActions={edgeForm?.retryActions || []}
            finalWaitTime={edgeForm?.finalWaitTime}
            availableActions={controllerActions}
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
        <Button onClick={onClose}>Cancel</Button>
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
