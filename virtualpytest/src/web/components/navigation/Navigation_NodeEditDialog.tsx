import { Close as CloseIcon } from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  IconButton,
} from '@mui/material';
import React from 'react';

import { useNodeEdit } from '../../hooks/navigation/useNodeEdit';
import { NodeEditDialogProps } from '../../types/pages/Navigation_Types';
import { getZIndex } from '../../utils/zIndexUtils';
import { VerificationsList } from '../verification/VerificationsList';

export const NodeEditDialog: React.FC<NodeEditDialogProps> = ({
  isOpen,
  nodeForm,
  nodes,
  setNodeForm,
  onSubmit,
  onClose,
  onResetNode,
  selectedHost,
  isControlActive = false,
  model,
}) => {
  // Early return if nodeForm is null or undefined
  if (!nodeForm) {
    return null;
  }

  // Early return if this is an entry node - entry nodes should not be editable
  if ((nodeForm.type as string) === 'entry') {
    return null;
  }

  // Early return if selectedHost is invalid
  if (!selectedHost) {
    return (
      <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ pb: 0.5 }}>Edit Node</DialogTitle>
        <DialogContent sx={{ py: 0.5 }}>
          <Typography color="error">
            No valid host device selected. Please select a host device first.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ pt: 0.5 }}>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Use the focused node edit hook
  const nodeEdit = useNodeEdit({
    isOpen,
    nodeForm,
    setNodeForm,
    selectedHost,
    isControlActive,
  });

  const handleSave = () => {
    nodeEdit.handleSave(onSubmit);
  };

  const buttonVisibility = nodeEdit.getButtonVisibility();

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      sx={{ zIndex: getZIndex('NAVIGATION_DIALOGS') }}
    >
      <DialogTitle sx={{ pb: 0.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Edit Node</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ py: 0.5 }}>
        {/* Node Name and Type in columns */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            label="Node Name"
            value={nodeForm?.label || ''}
            onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
            fullWidth
            required
            error={!nodeForm?.label?.trim()}
            margin="dense"
            size="small"
          />
          <FormControl fullWidth margin="dense" size="small">
            <InputLabel>Type</InputLabel>
            <Select
              value={nodeForm?.type || 'screen'}
              label="Type"
              onChange={(e) => setNodeForm({ ...nodeForm, type: e.target.value as any })}
            >
              <MenuItem value="menu">Menu</MenuItem>
              <MenuItem value="screen">Screen</MenuItem>
              <MenuItem value="action">Action</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Depth, Priority and Parent below in columns */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
          <TextField
            label="Depth"
            value={nodeForm?.depth || 0}
            fullWidth
            InputProps={{ readOnly: true }}
            variant="outlined"
            margin="dense"
            size="small"
          />
          <FormControl fullWidth margin="dense" size="small">
            <InputLabel>Priority</InputLabel>
            <Select
              value={nodeForm?.priority || 'p3'}
              label="Priority"
              onChange={(e) =>
                setNodeForm({ ...nodeForm, priority: e.target.value as 'p1' | 'p2' | 'p3' })
              }
            >
              <MenuItem value="p1">P1 Critical</MenuItem>
              <MenuItem value="p2">P2 Major</MenuItem>
              <MenuItem value="p3">P3 Minor</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Parent"
            value={nodeEdit.getParentNames(nodeForm?.parent || [], nodes)}
            fullWidth
            InputProps={{ readOnly: true }}
            variant="outlined"
            margin="dense"
            size="small"
          />
        </Box>

        {/* Single line description */}
        <TextField
          label="Description"
          value={nodeForm?.description || ''}
          onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
          fullWidth
          margin="dense"
          size="small"
          sx={{ mb: 1 }}
        />

        {/* Screenshot URL Field - only show for non-entry nodes */}
        {(nodeForm?.type as string) !== 'entry' && (
          <TextField
            label="Screenshot URL"
            value={nodeForm?.screenshot || ''}
            onChange={(e) => setNodeForm({ ...nodeForm, screenshot: e.target.value })}
            fullWidth
            margin="dense"
            size="small"
            sx={{ mb: 1 }}
          />
        )}

        {/* Verification Section */}
        <VerificationsList
          verifications={nodeEdit.verification.verifications}
          availableVerifications={nodeEdit.verification.availableVerificationTypes}
          onVerificationsChange={nodeEdit.handleVerificationsChange}
          loading={nodeEdit.verification.loading}
          model={model || 'android_mobile'}
          selectedHost={selectedHost}
          onTest={nodeEdit.verification.handleTest}
          testResults={nodeEdit.verification.testResults}
          onReferenceSelected={() => {}}
          modelReferences={{}}
          referencesLoading={false}
          showCollapsible={false}
          title="Verifications"
        />

        {nodeEdit.gotoResult && (
          <Box
            sx={{
              p: 1,
              bgcolor:
                nodeEdit.gotoResult.includes('❌') || nodeEdit.gotoResult.includes('⚠️')
                  ? 'error.light'
                  : 'success.light',
              borderRadius: 1,
              maxHeight: 200,
              overflow: 'auto',
              mt: 1,
            }}
          >
            <Typography
              variant="body2"
              sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line', fontSize: '0.75rem' }}
            >
              {nodeEdit.gotoResult}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ pt: 0.5 }}>
        {onResetNode && (
          <Button onClick={() => onResetNode()} variant="outlined" color="warning">
            Reset Node
          </Button>
        )}
        <Button onClick={handleSave} variant="contained" disabled={!nodeEdit.isFormValid(nodeForm)}>
          {nodeEdit.saveSuccess ? '✓' : 'Save'}
        </Button>
        <Button
          onClick={nodeEdit.verification.handleTest}
          variant="contained"
          disabled={!buttonVisibility.canTest || nodeEdit.verification.loading}
          sx={{
            opacity: !buttonVisibility.canTest || nodeEdit.verification.loading ? 0.5 : 1,
          }}
        >
          {nodeEdit.verification.loading ? 'Running...' : 'Run'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
