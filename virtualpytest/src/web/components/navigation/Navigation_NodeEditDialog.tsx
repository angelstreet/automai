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
import React, { useEffect, useCallback } from 'react';

// Import proper types from navigationTypes
import { useNode } from '../../hooks/navigation/useNode';
import { NodeEditDialogProps } from '../../types/pages/Navigation_Types';
import { Verification } from '../../types/verification/Verification_Types';
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
  modelReferences,
  referencesLoading,
}) => {
  // Early return if nodeForm is null or undefined - MUST be before any hooks
  if (!nodeForm) {
    return null;
  }

  // Early return if selectedHost is invalid - MUST be before verification hook
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

  // Use the consolidated node hook
  const nodeHook = useNode({
    selectedHost,
    isControlActive,
  });

  // Initialize verifications from nodeForm when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    console.log(`[@component:NodeEditDialog] Dialog opened, initializing verifications`);
    nodeHook.initializeVerifications(nodeForm);
  }, [isOpen, nodeForm, nodeHook]);

  // Handle verification changes by creating a custom handler that updates nodeForm
  const handleVerificationsChange = useCallback(
    (newVerifications: Verification[]) => {
      console.log(
        `[@component:NodeEditDialog] Updating nodeForm with new verifications:`,
        newVerifications,
      );

      nodeHook.handleVerificationsChange(newVerifications, nodeForm, setNodeForm);
    },
    [nodeForm, nodeHook, setNodeForm],
  );

  // Handle reference selection
  const handleReferenceSelected = (referenceName: string, referenceData: any) => {
    console.log('[@component:NodeEditDialog] Reference selected:', referenceName, referenceData);
    // Reference selection is handled internally by VerificationsList
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      nodeHook.resetDialogState();
    }
  }, [isOpen, nodeHook]);

  const handleSave = () => {
    nodeHook.handleSave(onSubmit);
  };

  // Use the runGoto function
  const handleRunGoto = () => {
    nodeHook.runGoto();
  };

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
              value={nodeHook.getParentNames(nodeForm?.parent || [], nodes)}
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
          {nodeForm?.type !== 'entry' && (
            <TextField
              label="Screenshot URL"
              value={nodeForm?.screenshot || ''}
              onChange={(e) => setNodeForm({ ...nodeForm, screenshot: e.target.value })}
              fullWidth
              size="small"
            />
          )}

          {/* Verification Section - using same hooks as VerificationEditor */}
          <VerificationsList
            verifications={nodeHook.verification.verifications}
            availableVerifications={nodeHook.verification.availableVerificationTypes}
            onVerificationsChange={handleVerificationsChange}
            loading={nodeHook.verification.loading}
            model={model || 'android_mobile'}
            selectedHost={selectedHost}
            onTest={nodeHook.verification.handleTest}
            testResults={nodeHook.verification.testResults}
            onReferenceSelected={handleReferenceSelected}
            modelReferences={modelReferences}
            referencesLoading={referencesLoading}
            showCollapsible={false}
            title="Verifications"
          />

          {nodeHook.gotoResult && (
            <Box
              sx={{
                p: 2,
                bgcolor:
                  nodeHook.gotoResult.includes('❌') || nodeHook.gotoResult.includes('⚠️')
                    ? 'error.light'
                    : 'success.light',
                borderRadius: 1,
                maxHeight: 300,
                overflow: 'auto',
                mb: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {nodeHook.gotoResult}
              </Typography>
            </Box>
          )}

          {/* Entry node note */}
          {nodeForm?.type === 'entry' && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Entry points are automatically positioned. Edit the connecting edge to change entry
              method and details.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {onResetNode && (
          <Button onClick={() => onResetNode()} variant="outlined" color="warning">
            Reset Node
          </Button>
        )}
        <Button onClick={handleSave} variant="contained" disabled={!nodeHook.isFormValid(nodeForm)}>
          {nodeHook.saveSuccess ? '✓' : 'Save'}
        </Button>
        <Button
          onClick={nodeHook.verification.handleTest}
          variant="contained"
          disabled={
            !isControlActive ||
            !selectedHost ||
            nodeHook.verification.verifications.length === 0 ||
            nodeHook.verification.loading
          }
          sx={{
            opacity:
              !isControlActive ||
              !selectedHost ||
              nodeHook.verification.verifications.length === 0 ||
              nodeHook.verification.loading
                ? 0.5
                : 1,
          }}
        >
          {nodeHook.verification.loading ? 'Running...' : 'Run'}
        </Button>
        <Button
          onClick={handleRunGoto}
          variant="contained"
          color="primary"
          disabled={!nodeHook.getButtonVisibility().canRunGoto || nodeHook.isRunningGoto}
          sx={{
            opacity: !nodeHook.getButtonVisibility().canRunGoto || nodeHook.isRunningGoto ? 0.5 : 1,
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          {nodeHook.isRunningGoto ? 'Going...' : 'Go To'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
