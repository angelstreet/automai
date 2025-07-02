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
import React, { useState } from 'react';

import { useEdgeEdit } from '../../hooks/navigation/useEdgeEdit';
import { Host } from '../../types/common/Host_Types';
import { UINavigationEdge, EdgeForm } from '../../types/pages/Navigation_Types';
import { ActionsList } from '../actions';
import { ActionDependencyDialog } from '../actions/ActionDependencyDialog';

interface EdgeEditDialogProps {
  isOpen: boolean;
  edgeForm: EdgeForm;
  setEdgeForm: React.Dispatch<React.SetStateAction<EdgeForm>>;
  onSubmit: (formData: any) => void;
  onClose: () => void;
  selectedEdge?: UINavigationEdge | null;
  isControlActive?: boolean;
  selectedHost?: Host | null;
}

export const EdgeEditDialog: React.FC<EdgeEditDialogProps> = ({
  isOpen,
  edgeForm,
  setEdgeForm,
  onSubmit,
  onClose,
  selectedEdge: _selectedEdge,
  isControlActive = false,
  selectedHost,
}) => {
  // State for dependency dialog
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
  const [dependencyEdges, setDependencyEdges] = useState<any[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState<any>(null);

  const edgeEdit = useEdgeEdit({
    isOpen,
    edgeForm,
    setEdgeForm,
    selectedHost,
    isControlActive,
  });

  // Enhanced submit handler with dependency checking
  const handleSubmitWithDependencyCheck = async () => {
    if (!edgeEdit.isFormValid()) return;

    // Check for existing actions that might have dependencies
    const actionsToCheck = [...edgeEdit.localActions, ...edgeEdit.localRetryActions].filter(
      (action) => action.id && action.id.length > 10,
    ); // Only check real DB IDs

    if (actionsToCheck.length > 0) {
      let hasSharedActions = false;
      const allAffectedEdges: any[] = [];

      // Check dependencies for all actions
      for (const action of actionsToCheck) {
        try {
          const response = await fetch('/server/action/checkDependencies', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action_id: action.id,
            }),
          });

          const result = await response.json();
          if (result.success && result.count > 1) {
            hasSharedActions = true;
            allAffectedEdges.push(...result.edges);
          }
        } catch (error) {
          console.warn('Failed to check dependencies for action:', action.id, error);
        }
      }

      if (hasSharedActions) {
        // Show dependency dialog
        setDependencyEdges(allAffectedEdges);
        setPendingSubmit(edgeForm);
        setDependencyDialogOpen(true);
        return;
      }
    }

    // No dependencies or no shared actions, proceed directly
    onSubmit(edgeForm);
  };

  const handleDependencyConfirm = () => {
    setDependencyDialogOpen(false);
    if (pendingSubmit) {
      onSubmit(pendingSubmit);
    }
    setPendingSubmit(null);
    setDependencyEdges([]);
  };

  const handleDependencyCancel = () => {
    setDependencyDialogOpen(false);
    setPendingSubmit(null);
    setDependencyEdges([]);
  };

  const handleRunActions = () => {
    edgeEdit.executeLocalActions(edgeForm);
  };

  if (!edgeForm) return null;

  return (
    <>
      <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Edit Edge</Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ py: 0.5 }}>
          {/* Description */}
          <TextField
            label="Description"
            value={edgeForm.description || ''}
            onChange={(e) =>
              setEdgeForm({
                ...edgeForm,
                description: e.target.value,
              })
            }
            fullWidth
            margin="dense"
            size="small"
            sx={{ mb: 1 }}
          />

          {/* Main Actions */}
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1,
              mb: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 0.5,
              }}
            >
              <Typography variant="h6" sx={{ fontSize: '1rem', m: 0 }}>
                Main Actions
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const newAction = {
                    id: `action_${Date.now()}`,
                    command: '',
                    params: {},
                    description: '',
                  };
                  edgeEdit.handleActionsChange([...edgeEdit.localActions, newAction]);
                }}
                sx={{ fontSize: '0.75rem', px: 1, py: 0.25 }}
              >
                + Add
              </Button>
            </Box>
            {edgeEdit.localActions.length > 0 ? (
              <ActionsList
                actions={edgeEdit.localActions}
                onActionsUpdate={edgeEdit.handleActionsChange}
              />
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: 'italic', textAlign: 'center', py: 0.5 }}
              >
                No actions found
              </Typography>
            )}
          </Box>

          {/* Retry Actions */}
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 1,
              mb: 1,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 0.5,
              }}
            >
              <Typography variant="h6" sx={{ fontSize: '1rem', m: 0 }}>
                Retry Actions
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const newAction = {
                    id: `retry_action_${Date.now()}`,
                    command: '',
                    params: {},
                    description: '',
                  };
                  edgeEdit.handleRetryActionsChange([...edgeEdit.localRetryActions, newAction]);
                }}
                sx={{ fontSize: '0.75rem', px: 1, py: 0.25 }}
              >
                + Add
              </Button>
            </Box>
            {edgeEdit.localRetryActions.length > 0 ? (
              <ActionsList
                actions={edgeEdit.localRetryActions}
                onActionsUpdate={edgeEdit.handleRetryActionsChange}
              />
            ) : (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontStyle: 'italic', textAlign: 'center', py: 0.5 }}
              >
                No retry actions found
              </Typography>
            )}
          </Box>

          {/* Final Wait Time */}
          <TextField
            label="Final Wait Time (ms)"
            type="number"
            value={edgeForm.finalWaitTime || 2000}
            onChange={(e) =>
              setEdgeForm({
                ...edgeForm,
                finalWaitTime: parseInt(e.target.value) || 2000,
              })
            }
            fullWidth
            margin="dense"
            size="small"
            inputProps={{ min: 0, step: 100 }}
          />

          {/* Action Result Display */}
          {edgeEdit.actionResult && (
            <Box
              sx={{
                mt: 1,
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                backgroundColor: 'background.default',
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Action Result:
              </Typography>
              <Typography
                variant="body2"
                component="pre"
                sx={{ fontSize: '0.75rem', whiteSpace: 'pre-wrap' }}
              >
                {edgeEdit.actionResult}
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ pt: 0.5 }}>
          <Button
            onClick={handleSubmitWithDependencyCheck}
            variant="contained"
            disabled={!edgeEdit.isFormValid()}
          >
            Save
          </Button>
          <Button
            onClick={handleRunActions}
            variant="contained"
            disabled={!edgeEdit.canRunLocalActions()}
            sx={{ opacity: !edgeEdit.canRunLocalActions() ? 0.5 : 1 }}
          >
            {edgeEdit.actionHook.loading ? 'Running...' : 'Run'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dependency Warning Dialog */}
      <ActionDependencyDialog
        isOpen={dependencyDialogOpen}
        edges={dependencyEdges}
        onConfirm={handleDependencyConfirm}
        onCancel={handleDependencyCancel}
      />
    </>
  );
};
