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
import React from 'react';

import { useEdgeEdit } from '../../hooks/navigation/useEdgeEdit';
import { Host } from '../../types/common/Host_Types';
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
  selectedHost?: Host | null;
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
  // Early return if edgeForm is null or undefined
  if (!edgeForm) {
    return null;
  }

  // Use the focused edge edit hook
  const edgeEdit = useEdgeEdit({
    isOpen,
    edgeForm,
    setEdgeForm,
    selectedHost,
    isControlActive,
  });

  const handleRunActions = async () => {
    await edgeEdit.executeLocalActions(edgeForm);
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

          {/* Main Actions */}
          <Box
            sx={{
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
              p: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
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
                sx={{ fontSize: '0.75rem', px: 1 }}
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
                sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}
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
              p: 2,
              mb: 2,
            }}
          >
            <Box
              sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}
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
                sx={{ fontSize: '0.75rem', px: 1 }}
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
                sx={{ fontStyle: 'italic', textAlign: 'center', py: 2 }}
              >
                No retry actions found
              </Typography>
            )}
          </Box>

          {/* Separator */}
          <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, mt: 1 }}>
            {/* Final Wait Time */}
            <TextField
              label="Final Wait Time (ms)"
              type="number"
              value={edgeForm?.finalWaitTime || 0}
              onChange={(e) =>
                setEdgeForm({ ...edgeForm, finalWaitTime: parseInt(e.target.value) || 0 })
              }
              fullWidth
              size="small"
              helperText="Time to wait after all actions complete"
            />
          </Box>

          {edgeEdit.actionResult && (
            <Box
              sx={{
                p: 2,
                bgcolor: edgeEdit.actionResult.includes('❌ OVERALL RESULT: FAILED')
                  ? 'error.light'
                  : edgeEdit.actionResult.includes('✅ OVERALL RESULT: SUCCESS')
                    ? 'success.light'
                    : edgeEdit.actionResult.includes('❌') && !edgeEdit.actionResult.includes('✅')
                      ? 'error.light'
                      : edgeEdit.actionResult.includes('⚠️')
                        ? 'warning.light'
                        : 'success.light',
                borderRadius: 1,
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {edgeEdit.actionResult}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => onSubmit(edgeForm)}
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
  );
};
