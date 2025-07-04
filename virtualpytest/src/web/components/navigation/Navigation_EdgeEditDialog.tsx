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
  CircularProgress,
} from '@mui/material';
import React, { useState } from 'react';

import { useEdgeEdit } from '../../hooks/navigation/useEdgeEdit';
import { Host } from '../../types/common/Host_Types';
import { UINavigationEdge, EdgeForm } from '../../types/pages/Navigation_Types';
import { getZIndex } from '../../utils/zIndexUtils';
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
  fromLabel?: string;
  toLabel?: string;
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
  fromLabel = '',
  toLabel = '',
}) => {
  // State for dependency dialog
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
  const [dependencyEdges, setDependencyEdges] = useState<any[]>([]);
  const [pendingSubmit, setPendingSubmit] = useState<any>(null);
  const [isCheckingDependencies, setIsCheckingDependencies] = useState(false);

  const edgeEdit = useEdgeEdit({
    isOpen,
    edgeForm,
    setEdgeForm,
    selectedEdge: _selectedEdge,
    selectedHost,
    isControlActive,
  });

  // Enhanced submit handler with dependency checking
  const handleSubmitWithDependencyCheck = async () => {
    if (!edgeEdit.isFormValid()) return;

    // Check for existing actions that might have dependencies
    const allActions = [...edgeEdit.localActions, ...edgeEdit.localRetryActions];

    setIsCheckingDependencies(true);
    try {
      // Use the new checkDependencies function from the hook
      const result = await edgeEdit.checkDependencies(allActions);

      if (result.success && result.has_shared_actions) {
        // Show dependency dialog
        setDependencyEdges(result.edges);
        setPendingSubmit(edgeForm);
        setDependencyDialogOpen(true);
      } else if (result.success && !result.has_shared_actions) {
        // No dependencies found, proceed with saving
        onSubmit(edgeForm);
      } else {
        // Handle other cases (like API errors)
        console.warn('Unexpected dependency check result:', result);
        onSubmit(edgeForm);
      }
    } catch (error) {
      console.warn('Failed to check dependencies for actions:', error);
      // Continue with save if dependency check fails
      onSubmit(edgeForm);
    } finally {
      setIsCheckingDependencies(false);
    }
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
      <Dialog
        open={isOpen}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        sx={{ zIndex: getZIndex('NAVIGATION_DIALOGS') }}
      >
        <DialogTitle sx={{ pb: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">Edit Edge</Typography>
              {fromLabel && toLabel && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#1976d2' }}
                  >
                    {fromLabel}
                  </Typography>
                  <Typography variant="body1" sx={{ fontSize: '1rem' }}>
                    →
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#4caf50' }}
                  >
                    {toLabel}
                  </Typography>
                </Box>
              )}
            </Box>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ py: 0.5 }}>
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
            value={edgeForm.finalWaitTime ?? 0}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              setEdgeForm({
                ...edgeForm,
                finalWaitTime: isNaN(value) ? 0 : value,
              });
            }}
            fullWidth
            margin="dense"
            size="small"
            inputProps={{ step: 100, min: 0 }}
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
            disabled={!edgeEdit.isFormValid() || isCheckingDependencies}
            startIcon={isCheckingDependencies ? <CircularProgress size={16} /> : null}
          >
            {isCheckingDependencies ? 'Checking...' : 'Save'}
          </Button>
          <Button
            onClick={handleRunActions}
            variant="contained"
            disabled={!edgeEdit.canRunLocalActions() || edgeEdit.actionHook.loading}
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
