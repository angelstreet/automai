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
        <DialogTitle>Edit Node</DialogTitle>
        <DialogContent>
          <Typography color="error">
            No valid host device selected. Please select a host device first.
          </Typography>
        </DialogContent>
        <DialogActions>
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

  const handleRunGoto = () => {
    nodeEdit.runGoto();
  };

  const buttonVisibility = nodeEdit.getButtonVisibility();

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Edit Node
          <IconButton size="small" onClick={onClose} sx={{ p: 0.25 }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Node Name and Type in columns */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Node Name"
              value={nodeForm?.label || ''}
              onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
              fullWidth
              required
              error={!nodeForm?.label?.trim()}
              size="small"
            />
            <FormControl fullWidth size="small">
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

          {/* Depth and Parent below in columns */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Depth"
              value={nodeForm?.depth || 0}
              fullWidth
              InputProps={{ readOnly: true }}
              variant="outlined"
              size="small"
            />
            <TextField
              label="Parent"
              value={nodeEdit.getParentNames(nodeForm?.parent || [], nodes)}
              fullWidth
              InputProps={{ readOnly: true }}
              variant="outlined"
              size="small"
            />
          </Box>

          {/* Single line description */}
          <TextField
            label="Description"
            value={nodeForm?.description || ''}
            onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
            fullWidth
            size="small"
          />

          {/* Screenshot URL Field - only show for non-entry nodes */}
          {(nodeForm?.type as string) !== 'entry' && (
            <TextField
              label="Screenshot URL"
              value={nodeForm?.screenshot || ''}
              onChange={(e) => setNodeForm({ ...nodeForm, screenshot: e.target.value })}
              fullWidth
              size="small"
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
                p: 2,
                bgcolor:
                  nodeEdit.gotoResult.includes('❌') || nodeEdit.gotoResult.includes('⚠️')
                    ? 'error.light'
                    : 'success.light',
                borderRadius: 1,
                maxHeight: 300,
                overflow: 'auto',
                mb: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {nodeEdit.gotoResult}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
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
        <Button
          onClick={handleRunGoto}
          variant="contained"
          color="primary"
          disabled={!buttonVisibility.canRunGoto || nodeEdit.isRunningGoto}
          sx={{
            opacity: !buttonVisibility.canRunGoto || nodeEdit.isRunningGoto ? 0.5 : 1,
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          {nodeEdit.isRunningGoto ? 'Going...' : 'Go To'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
