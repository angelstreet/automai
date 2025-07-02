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
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem' }}>
              Main Actions
            </Typography>
            <ActionsList
              actions={edgeEdit.localActions}
              onActionsUpdate={edgeEdit.handleActionsChange}
            />
          </Box>

          {/* Retry Actions */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontSize: '1rem' }}>
              Retry Actions (executed if main actions fail)
            </Typography>
            <ActionsList
              actions={edgeEdit.localRetryActions}
              onActionsUpdate={edgeEdit.handleRetryActionsChange}
            />
          </Box>

          {/* Final Wait Time */}
          <TextField
            label="Final Wait Time (ms)"
            type="number"
            value={edgeForm?.finalWaitTime || 2000}
            onChange={(e) =>
              setEdgeForm({ ...edgeForm, finalWaitTime: parseInt(e.target.value) || 2000 })
            }
            fullWidth
            size="small"
            helperText="Time to wait after all actions complete"
          />

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
