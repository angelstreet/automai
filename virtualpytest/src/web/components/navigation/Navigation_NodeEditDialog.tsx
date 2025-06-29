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
import React, { useState, useEffect, useCallback } from 'react';

// Import proper types from navigationTypes
import { useVerification } from '../../hooks/verification/useVerification';
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

  // Use the same verification hooks as VerificationEditor - now safe to call
  const verification = useVerification({
    selectedHost: selectedHost,
    captureSourcePath: undefined, // NodeEditDialog doesn't capture images
  });

  // Simple node operations replacement
  const [gotoResult, setGotoResult] = useState<string>('');
  const [isRunningGoto, setIsRunningGoto] = useState(false);
  const canRunGoto = isControlActive && selectedHost && nodeForm;

  const runGoto = useCallback(async () => {
    if (!canRunGoto) return;

    setIsRunningGoto(true);
    setGotoResult('Running goto operation...');

    try {
      // Mock implementation - replace with actual goto logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setGotoResult('✅ Goto operation completed successfully');
    } catch (error) {
      setGotoResult(`❌ Goto operation failed: ${error}`);
    } finally {
      setIsRunningGoto(false);
    }
  }, [canRunGoto]);

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize verifications from nodeForm when dialog opens
  useEffect(() => {
    if (!isOpen) return;

    console.log(`[@component:NodeEditDialog] Dialog opened, initializing verifications`);

    // Use verifications directly from nodeForm (no database fetching needed)
    const nodeVerifications = nodeForm?.verifications || [];
    console.log(
      `[@component:NodeEditDialog] Using verifications from nodeForm:`,
      nodeVerifications,
    );
    verification.handleVerificationsChange(nodeVerifications);
  }, [isOpen, nodeForm?.verifications]); // Only depend on isOpen and verifications

  // Handle verification changes by creating a custom handler that updates nodeForm
  const handleVerificationsChange = useCallback(
    (newVerifications: Verification[]) => {
      console.log(
        `[@component:NodeEditDialog] Updating nodeForm with new verifications:`,
        newVerifications,
      );

      // Update both the verification hook and the nodeForm
      verification.handleVerificationsChange(newVerifications);
      setNodeForm({
        ...nodeForm,
        verifications: newVerifications,
      });
    },
    [nodeForm, verification.handleVerificationsChange, setNodeForm],
  );

  // Handle reference selection
  const handleReferenceSelected = (referenceName: string, referenceData: any) => {
    console.log('[@component:NodeEditDialog] Reference selected:', referenceName, referenceData);
    // Reference selection is handled internally by VerificationsList
  };

  // Helper function to get parent names from IDs
  const getParentNames = (parentIds: string[]): string => {
    if (!parentIds || parentIds.length === 0) return 'None';
    if (!nodes || !Array.isArray(nodes)) return 'None';

    const parentNames = parentIds.map((id) => {
      const parentNode = nodes.find((node) => node.id === id);
      return parentNode ? parentNode.data.label : id;
    });

    return parentNames.join(' > ');
  };

  useEffect(() => {
    if (!isOpen) {
      // Reset state when dialog closes
      setSaveSuccess(false);
      // Also clear verifications to prevent stale data
      verification.handleVerificationsChange([]);
    }
  }, [isOpen, verification.handleVerificationsChange]);

  const handleSave = () => {
    onSubmit();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const isFormValid = () => {
    const basicFormValid = nodeForm?.label?.trim();
    const verificationsValid =
      !verification.verifications ||
      verification.verifications.every((verificationItem) => {
        // Skip verifications that don't have a command (not configured yet)
        if (!verificationItem.command) return true;

        if (verificationItem.verification_type === 'image') {
          // Image verifications need a reference image
          const hasImagePath = verificationItem.params?.image_path;
          return Boolean(hasImagePath);
        } else if (verificationItem.verification_type === 'text') {
          // Text verifications need text to search for
          const hasText = verificationItem.params?.text;
          return Boolean(hasText);
        }

        return true;
      });
    return basicFormValid && verificationsValid;
  };

  // Use the runGoto function
  const handleRunGoto = () => {
    runGoto();
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
              value={getParentNames(nodeForm?.parent || [])}
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

          {/* Debug info - remove in production */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ p: 1, bgcolor: 'grey.100', borderRadius: 1, fontSize: '0.75rem' }}>
              <Typography variant="caption" component="div">
                Debug - NodeForm verifications: {nodeForm?.verifications?.length || 0}
              </Typography>
              <Typography variant="caption" component="div">
                Debug - NodeForm verification_ids: {nodeForm?.verification_ids?.length || 0}
              </Typography>
              <Typography variant="caption" component="div">
                Debug - Hook verifications: {verification.verifications?.length || 0}
              </Typography>
              <Typography variant="caption" component="div">
                Debug - Verification loading: {verification.loading ? 'Yes' : 'No'}
              </Typography>
            </Box>
          )}

          {/* Verification Section - using same hooks as VerificationEditor */}
          <VerificationsList
            verifications={verification.verifications}
            availableVerifications={verification.availableVerificationTypes}
            onVerificationsChange={handleVerificationsChange}
            loading={verification.loading}
            model={model || 'android_mobile'}
            selectedHost={selectedHost}
            onTest={verification.handleTest}
            testResults={verification.testResults}
            reloadTrigger={0}
            onReferenceSelected={handleReferenceSelected}
            modelReferences={modelReferences}
            referencesLoading={referencesLoading}
          />

          {gotoResult && (
            <Box
              sx={{
                p: 2,
                bgcolor:
                  gotoResult.includes('❌') || gotoResult.includes('⚠️')
                    ? 'error.light'
                    : 'success.light',
                borderRadius: 1,
                maxHeight: 300,
                overflow: 'auto',
                mb: 1,
              }}
            >
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {gotoResult}
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
        <Button onClick={handleSave} variant="contained" disabled={!isFormValid()}>
          {saveSuccess ? '✓' : 'Save'}
        </Button>
        <Button
          onClick={verification.handleTest}
          variant="contained"
          disabled={
            !isControlActive ||
            !selectedHost ||
            verification.verifications.length === 0 ||
            verification.loading
          }
          sx={{
            opacity:
              !isControlActive ||
              !selectedHost ||
              verification.verifications.length === 0 ||
              verification.loading
                ? 0.5
                : 1,
          }}
        >
          {verification.loading ? 'Running...' : 'Run'}
        </Button>
        <Button
          onClick={handleRunGoto}
          variant="contained"
          color="primary"
          disabled={!canRunGoto || isRunningGoto}
          sx={{
            opacity: !canRunGoto || isRunningGoto ? 0.5 : 1,
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
          }}
        >
          {isRunningGoto ? 'Going...' : 'Go To'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
