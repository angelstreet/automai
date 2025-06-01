import React, { useState, useEffect } from 'react';
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
  Divider,
} from '@mui/material';
import { NodeVerificationsList } from './NodeVerificationsList';

interface NodeForm {
  label: string;
  type: 'screen' | 'dialog' | 'popup' | 'overlay' | 'menu' | 'entry';
  description: string;
  screenshot?: string;
  depth?: number;
  parent?: string[];
  verifications?: NodeVerification[];
}

interface NodeVerification {
  id: string;
  label: string;
  command: string;
  controller_type: 'text' | 'image';
  params: any;
  description?: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputValue?: string;
}

interface VerificationAction {
  id: string;
  label: string;
  command: string;
  params: any;
  description: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
}

interface VerificationActions {
  [category: string]: VerificationAction[];
}

interface UINavigationNode {
  id: string;
  data: {
    label: string;
    verifications?: NodeVerification[];
  };
}

interface NodeEditDialogProps {
  isOpen: boolean;
  nodeForm: NodeForm;
  nodes: UINavigationNode[];
  setNodeForm: React.Dispatch<React.SetStateAction<NodeForm>>;
  onSubmit: () => void;
  onClose: () => void;
  onResetNode?: () => void;
  // Verification-related props
  verificationControllerTypes?: string[];
  isVerificationActive?: boolean;
  selectedDevice?: string | null;
}

export const NodeEditDialog: React.FC<NodeEditDialogProps> = ({
  isOpen,
  nodeForm,
  nodes,
  setNodeForm,
  onSubmit,
  onClose,
  onResetNode,
  verificationControllerTypes = [],
  isVerificationActive = false,
  selectedDevice = null,
}) => {
  const [verificationActions, setVerificationActions] = useState<VerificationActions>({});
  const [loadingVerifications, setLoadingVerifications] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isRunningVerifications, setIsRunningVerifications] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);

  const canRunVerifications = isVerificationActive && selectedDevice && 
    nodeForm.verifications && nodeForm.verifications.length > 0 && !isRunningVerifications;

  // Helper function to get parent names from IDs
  const getParentNames = (parentIds: string[]): string => {
    if (!parentIds || parentIds.length === 0) return 'None';
    if (!nodes || !Array.isArray(nodes)) return 'None'; // Safety check for undefined nodes
    
    const parentNames = parentIds.map(id => {
      const parentNode = nodes.find(node => node.id === id);
      return parentNode ? parentNode.data.label : id; // Fallback to ID if node not found
    });
    
    return parentNames.join(' > ');
  };

  useEffect(() => {
    if (!isOpen) {
      setVerificationResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    console.log(`[@component:NodeEditDialog] Dialog opened: ${isOpen}, verificationControllerTypes:`, verificationControllerTypes);
    if (isOpen && verificationControllerTypes.length > 0) {
      console.log(`[@component:NodeEditDialog] Fetching verification actions`);
      fetchVerificationActions();
    } else if (isOpen && verificationControllerTypes.length === 0) {
      console.log('[@component:NodeEditDialog] No verification controller types provided');
      setVerificationError('No verification controllers available');
    }
  }, [isOpen, verificationControllerTypes]);

  const fetchVerificationActions = async () => {
    setLoadingVerifications(true);
    setVerificationError(null);
    
    try {
      console.log(`[@component:NodeEditDialog] Fetching verification actions from: http://localhost:5009/api/virtualpytest/verification/actions`);
      const response = await fetch(`http://localhost:5009/api/virtualpytest/verification/actions`);
      const result = await response.json();
      
      console.log(`[@component:NodeEditDialog] Verification API response:`, result);
      
      if (result.success) {
        setVerificationActions(result.actions);
        console.log(`[@component:NodeEditDialog] Loaded verification actions`);
      } else {
        console.error(`[@component:NodeEditDialog] Verification API returned error:`, result.error);
        setVerificationError(result.error || 'Failed to load verification actions');
      }
    } catch (err: any) {
      console.error('[@component:NodeEditDialog] Error fetching verification actions:', err);
      setVerificationError('Failed to connect to verification server');
    } finally {
      setLoadingVerifications(false);
    }
  };

  const isFormValid = () => {
    const basicFormValid = nodeForm.label.trim();
    const verificationsValid = !nodeForm.verifications || nodeForm.verifications.every(verification => 
      !verification.id || !verification.requiresInput || (verification.inputValue && verification.inputValue.trim())
    );
    return basicFormValid && verificationsValid;
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleRunVerifications = async () => {
    if (!nodeForm.verifications || nodeForm.verifications.length === 0) return;
    
    setIsRunningVerifications(true);
    setVerificationResult(null);
    
    try {
      let results: string[] = [];
      
      for (let i = 0; i < nodeForm.verifications.length; i++) {
        const verification = nodeForm.verifications[i];
        
        if (!verification.id) {
          results.push(`❌ Verification ${i + 1}: No verification selected`);
          continue;
        }
        
        console.log(`[@component:NodeEditDialog] Executing verification ${i + 1}/${nodeForm.verifications.length}: ${verification.label}`);
        
        const verificationToExecute = {
          ...verification,
          params: { ...verification.params }
        };
        
        // Set the text parameter for text verifications
        if (verification.requiresInput && verification.inputValue) {
          if (verification.command === 'waitForImageToAppear' || verification.command === 'waitForImageToDisappear') {
            if (verification.controller_type === 'text') {
              // For text verification, the image_path parameter is actually the text to search for
              verificationToExecute.params.image_path = verification.inputValue;
            } else if (verification.controller_type === 'image') {
              // For image verification, use the input as the image path
              verificationToExecute.params.image_path = verification.inputValue;
            }
          }
        }
        
        try {
          const response = await fetch(`http://localhost:5009/api/virtualpytest/verification/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              verification: verificationToExecute
            }),
          });
          
          const result = await response.json();
          
          if (result.success) {
            results.push(`✅ Verification ${i + 1}: ${result.message || 'Success'}`);
          } else {
            results.push(`❌ Verification ${i + 1}: ${result.error || 'Failed'}`);
          }
        } catch (err: any) {
          results.push(`❌ Verification ${i + 1}: ${err.message || 'Network error'}`);
        }
        
        // Small delay between verifications
        await delay(1000);
      }
      
      setVerificationResult(results.join('\n'));
      console.log(`[@component:NodeEditDialog] All verifications completed`);
      
    } catch (err: any) {
      console.error('[@component:NodeEditDialog] Error executing verifications:', err);
      setVerificationResult(`❌ ${err.message}`);
    } finally {
      setIsRunningVerifications(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Node</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Basic Node Properties */}
          <TextField
            label="Node Name"
            value={nodeForm.label}
            onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
            fullWidth
            required
            error={!nodeForm.label.trim()}
            helperText={!nodeForm.label.trim() ? "Node name is required" : ""}
          />
          
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              value={nodeForm.type}
              label="Type"
              onChange={(e) => setNodeForm({ ...nodeForm, type: e.target.value as any })}
            >
              <MenuItem value="screen">Screen</MenuItem>
              <MenuItem value="dialog">Dialog</MenuItem>
              <MenuItem value="popup">Popup</MenuItem>
              <MenuItem value="overlay">Overlay</MenuItem>
              <MenuItem value="menu">Menu</MenuItem>
              <MenuItem value="entry">Entry Point</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            label="Description"
            value={nodeForm.description}
            onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
            multiline
            rows={2}
            fullWidth
          />
          
          {/* Screenshot URL Field - only show for non-entry nodes */}
          {nodeForm.type !== 'entry' && (
            <TextField
              label="Screenshot URL"
              value={nodeForm.screenshot || ''}
              onChange={(e) => setNodeForm({ ...nodeForm, screenshot: e.target.value })}
              fullWidth
              placeholder="Enter screenshot URL or path"
              helperText="URL or file path to the screenshot image"
            />
          )}
          
          {/* Parent and Depth Info (Read-only) */}
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Depth"
              value={nodeForm.depth || 0}
              fullWidth
              InputProps={{ readOnly: true }}
              variant="outlined"
              size="small"
            />
            <TextField
              label="Parent"
              value={getParentNames(nodeForm.parent || [])}
              fullWidth
              InputProps={{ readOnly: true }}
              variant="outlined"
              size="small"
            />
          </Box>

          {/* Verification Section */}
          {nodeForm.type !== 'entry' && (
            <>
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h6">
                  Node Verifications
                </Typography>
                {isVerificationActive && selectedDevice && (
                  <Typography variant="body2" color="success.main">
                    Controllers Active
                  </Typography>
                )}
                {(!isVerificationActive || !selectedDevice) && (
                  <Typography variant="body2" color="warning.main">
                    Take device control to test verifications
                  </Typography>
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary">
                Add verifications to validate this screen state when navigating to this node
              </Typography>
              
              <NodeVerificationsList
                verifications={nodeForm.verifications || []}
                availableActions={verificationActions}
                onVerificationsChange={(newVerifications: NodeVerification[]) => 
                  setNodeForm({ ...nodeForm, verifications: newVerifications })
                }
                loading={loadingVerifications}
                error={verificationError}
              />

              {verificationResult && (
                <Box sx={{ 
                  p: 2, 
                  bgcolor: verificationResult.includes('❌') ? 'error.light' : 'success.light', 
                  borderRadius: 1,
                  maxHeight: 200,
                  overflow: 'auto'
                }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                    {verificationResult}
                  </Typography>
                </Box>
              )}
            </>
          )}
          
          {/* Entry node note */}
          {nodeForm.type === 'entry' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
              Entry points are automatically positioned. Edit the connecting edge to change entry method and details.
            </Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        {onResetNode && (
          <Button 
            onClick={onResetNode}
            variant="outlined"
            color="warning"
            sx={{ mr: 'auto' }}
          >
            Reset Node
          </Button>
        )}
        {canRunVerifications && (
          <Button 
            onClick={handleRunVerifications} 
            variant="outlined"
            disabled={!canRunVerifications}
            sx={{ opacity: !canRunVerifications ? 0.5 : 1 }}
          >
            {isRunningVerifications ? 'Testing...' : 'Test Verifications'}
          </Button>
        )}
        <Button 
          onClick={onSubmit} 
          variant="contained"
          disabled={!isFormValid()}
        >
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 