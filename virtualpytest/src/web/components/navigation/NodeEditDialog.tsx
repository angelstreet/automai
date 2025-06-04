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
  controller_type: 'text' | 'image' | 'adb';
  params: any;
  description?: string;
  requiresInput?: boolean;
  inputLabel?: string;
  inputPlaceholder?: string;
  inputValue?: string;
  last_run_result?: boolean[];
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
  // Add isControlActive like EdgeEditDialog
  isControlActive?: boolean;
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
  isControlActive = false,
}) => {
  const [verificationActions, setVerificationActions] = useState<VerificationActions>({});
  const [loadingVerifications, setLoadingVerifications] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [isRunningVerifications, setIsRunningVerifications] = useState(false);
  const [verificationResult, setVerificationResult] = useState<string | null>(null);
  const [isRunningGoto, setIsRunningGoto] = useState(false);
  const [gotoResult, setGotoResult] = useState<string | null>(null);

  // Utility function to update last run results (keeps last 10 results)
  const updateLastRunResults = (results: boolean[], newResult: boolean): boolean[] => {
    const updatedResults = [newResult, ...results];
    return updatedResults.slice(0, 10); // Keep only last 10 results
  };

  // Calculate confidence score from last run results (0-1 scale)
  const calculateConfidenceScore = (results?: boolean[]): number => {
    if (!results || results.length === 0) return 0.5; // Default confidence for new verifications
    const successCount = results.filter(result => result).length;
    return successCount / results.length;
  };

  // Use same logic as EdgeEditDialog
  const canRunVerifications = isControlActive && selectedDevice && 
    nodeForm.verifications && nodeForm.verifications.length > 0 && !isRunningVerifications;

  // Can run goto if we have control and device, and not already running goto
  const canRunGoto = isControlActive && selectedDevice && !isRunningGoto && !isRunningVerifications;

  // Helper function to get parent names from IDs
  const getParentNames = (parentIds: string[]): string => {
    if (!parentIds || parentIds.length === 0) return 'None';
    if (!nodes || !Array.isArray(nodes)) return 'None';
    
    const parentNames = parentIds.map(id => {
      const parentNode = nodes.find(node => node.id === id);
      return parentNode ? parentNode.data.label : id;
    });
    
    return parentNames.join(' > ');
  };

  useEffect(() => {
    if (!isOpen) {
      setVerificationResult(null);
      setGotoResult(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && verificationControllerTypes.length > 0 && Object.keys(verificationActions).length === 0) {
      fetchVerificationActions();
    }
  }, [isOpen, verificationControllerTypes, verificationActions]);

  const fetchVerificationActions = async () => {
    setLoadingVerifications(true);
    setVerificationError(null);
    
    try {
      console.log(`[@component:NodeEditDialog] Fetching verification actions from: http://localhost:5009/api/virtualpytest/verification/actions`);
      const response = await fetch(`http://localhost:5009/api/virtualpytest/verification/actions`);
      const result = await response.json();
      
      console.log(`[@component:NodeEditDialog] Verification API response:`, result);
      
      if (result.success) {
        setVerificationActions(result.verifications);
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
      const updatedVerifications = [...nodeForm.verifications];
      
      for (let i = 0; i < nodeForm.verifications.length; i++) {
        const verification = nodeForm.verifications[i];
        
        if (!verification.id) {
          results.push(`❌ Verification ${i + 1}: No verification selected`);
          // Update verification with failed result
          updatedVerifications[i] = {
            ...verification,
            last_run_result: updateLastRunResults(verification.last_run_result || [], false)
          };
          continue;
        }
        
        console.log(`[@component:NodeEditDialog] Executing verification ${i + 1}/${nodeForm.verifications.length}: ${verification.label}`);
        
        const verificationToExecute = {
          ...verification,
          params: { ...verification.params }
        };
        
        let verificationSuccess = false;
        
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
            verificationSuccess = true;
          } else {
            results.push(`❌ Verification ${i + 1}: ${result.error || 'Failed'}`);
            verificationSuccess = false;
          }
        } catch (err: any) {
          results.push(`❌ Verification ${i + 1}: ${err.message || 'Network error'}`);
          verificationSuccess = false;
        }
        
        // Update verification with result and confidence info
        const updatedLastRunResults = updateLastRunResults(verification.last_run_result || [], verificationSuccess);
        const confidenceScore = calculateConfidenceScore(updatedLastRunResults);
        
        updatedVerifications[i] = {
          ...verification,
          last_run_result: updatedLastRunResults
        };
        
        // Add confidence info to results
        results.push(`   📊 Confidence: ${(confidenceScore * 100).toFixed(1)}% (${updatedLastRunResults.length} runs)`);
        
        console.log(`[@component:NodeEditDialog] Verification ${i + 1} completed. Success: ${verificationSuccess}, New confidence: ${confidenceScore.toFixed(3)}`);
        
        // Small delay between verifications
        await delay(1000);
      }
      
      // Update the node form with the updated verifications
      setNodeForm(prev => ({
        ...prev,
        verifications: updatedVerifications
      }));
      
      setVerificationResult(results.join('\n'));
      console.log(`[@component:NodeEditDialog] All verifications completed`);
      
    } catch (err: any) {
      console.error('[@component:NodeEditDialog] Error executing verifications:', err);
      setVerificationResult(`❌ ${err.message}`);
    } finally {
      setIsRunningVerifications(false);
    }
  };

  const handleRunGoto = async () => {
    setIsRunningGoto(true);
    setGotoResult(null);
    setVerificationResult(null);
    
    try {
      let gotoResults: string[] = [];
      let navigationSuccess = false;
      
      // Step 1: Execute Navigation Steps
      gotoResults.push('🚀 Starting navigation to node...');
      console.log(`[@component:NodeEditDialog] Starting goto navigation for node: ${nodeForm.label}`);
      
      try {
        // Execute navigation to this node
        // This would typically involve calling the navigation API to reach this node
        const navigationResponse = await fetch(`http://localhost:5009/api/virtualpytest/navigation/goto`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nodeId: nodeForm.label, // or appropriate node identifier
            nodeType: nodeForm.type,
            description: nodeForm.description
          }),
        });
        
        const navigationResult = await navigationResponse.json();
        
        if (navigationResult.success) {
          gotoResults.push(`✅ Navigation: Successfully reached ${nodeForm.label}`);
          navigationSuccess = true;
          console.log(`[@component:NodeEditDialog] Navigation successful`);
        } else {
          gotoResults.push(`❌ Navigation: ${navigationResult.error || 'Failed to reach node'}`);
          console.error(`[@component:NodeEditDialog] Navigation failed:`, navigationResult.error);
        }
      } catch (err: any) {
        gotoResults.push(`❌ Navigation: ${err.message || 'Network error'}`);
        console.error('[@component:NodeEditDialog] Navigation error:', err);
      }
      
      // Step 2: Execute Verifications (only if navigation succeeded)
      let verificationSuccess = true;
      
      if (navigationSuccess && nodeForm.verifications && nodeForm.verifications.length > 0) {
        gotoResults.push('\n🔍 Running node verifications...');
        console.log(`[@component:NodeEditDialog] Starting verifications after successful navigation`);
        
        const updatedVerifications = [...nodeForm.verifications];
        
        // Small delay before verifications
        await delay(1500);
        
        for (let i = 0; i < nodeForm.verifications.length; i++) {
          const verification = nodeForm.verifications[i];
          
          if (!verification.id) {
            gotoResults.push(`❌ Verification ${i + 1}: No verification selected`);
            verificationSuccess = false;
            // Update verification with failed result
            updatedVerifications[i] = {
              ...verification,
              last_run_result: updateLastRunResults(verification.last_run_result || [], false)
            };
            continue;
          }
          
          console.log(`[@component:NodeEditDialog] Executing verification ${i + 1}/${nodeForm.verifications.length}: ${verification.label}`);
          
          const verificationToExecute = {
            ...verification,
            params: { ...verification.params }
          };
          
          let individualVerificationSuccess = false;
          
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
              gotoResults.push(`✅ Verification ${i + 1}: ${result.message || 'Success'}`);
              individualVerificationSuccess = true;
            } else {
              gotoResults.push(`❌ Verification ${i + 1}: ${result.error || 'Failed'}`);
              verificationSuccess = false;
              individualVerificationSuccess = false;
            }
          } catch (err: any) {
            gotoResults.push(`❌ Verification ${i + 1}: ${err.message || 'Network error'}`);
            verificationSuccess = false;
            individualVerificationSuccess = false;
          }
          
          // Update verification with result and confidence info
          const updatedLastRunResults = updateLastRunResults(verification.last_run_result || [], individualVerificationSuccess);
          const confidenceScore = calculateConfidenceScore(updatedLastRunResults);
          
          updatedVerifications[i] = {
            ...verification,
            last_run_result: updatedLastRunResults
          };
          
          // Add confidence info to goto results
          gotoResults.push(`   📊 Confidence: ${(confidenceScore * 100).toFixed(1)}% (${updatedLastRunResults.length} runs)`);
          
          console.log(`[@component:NodeEditDialog] Goto verification ${i + 1} completed. Success: ${individualVerificationSuccess}, New confidence: ${confidenceScore.toFixed(3)}`);
          
          // Small delay between verifications
          await delay(1000);
        }
        
        // Update the node form with the updated verifications after goto
        setNodeForm(prev => ({
          ...prev,
          verifications: updatedVerifications
        }));
        
      } else if (navigationSuccess && (!nodeForm.verifications || nodeForm.verifications.length === 0)) {
        gotoResults.push('ℹ️ No verifications configured for this node');
      }
      
      // Step 3: Final Result Summary
      const overallSuccess = navigationSuccess && verificationSuccess;
      gotoResults.push('');
      
      if (overallSuccess) {
        gotoResults.push('🎉 Goto operation completed successfully!');
        gotoResults.push(`✅ Navigation: Success`);
        gotoResults.push(`✅ Verifications: ${nodeForm.verifications?.length || 0} passed`);
      } else {
        gotoResults.push('⚠️ Goto operation completed with issues:');
        gotoResults.push(`${navigationSuccess ? '✅' : '❌'} Navigation: ${navigationSuccess ? 'Success' : 'Failed'}`);
        gotoResults.push(`${verificationSuccess ? '✅' : '❌'} Verifications: ${verificationSuccess ? 'Passed' : 'Failed'}`);
      }
      
      setGotoResult(gotoResults.join('\n'));
      console.log(`[@component:NodeEditDialog] Goto operation completed. Overall success: ${overallSuccess}`);
      
    } catch (err: any) {
      console.error('[@component:NodeEditDialog] Error during goto operation:', err);
      setGotoResult(`❌ Goto operation failed: ${err.message}`);
    } finally {
      setIsRunningGoto(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Edit Node</DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/* Node Name and Type in columns */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="Node Name"
              value={nodeForm.label}
              onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
              fullWidth
              required
              error={!nodeForm.label.trim()}
              size="small"
            />
            <FormControl fullWidth size="small">
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
              </Select>
            </FormControl>
          </Box>

          {/* Depth and Parent below in columns */}
          <Box sx={{ display: 'flex', gap: 1 }}>
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
          
          {/* Single line description */}
          <TextField
            label="Description"
            value={nodeForm.description}
            onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
            fullWidth
            size="small"
          />
          
          {/* Screenshot URL Field - only show for non-entry nodes */}
          {nodeForm.type !== 'entry' && (
            <TextField
              label="Screenshot URL"
              value={nodeForm.screenshot || ''}
              onChange={(e) => setNodeForm({ ...nodeForm, screenshot: e.target.value })}
              fullWidth
              size="small"
            />
          )}

          {/* Verification Section - now available for all node types including entry */}
          <NodeVerificationsList
            verifications={nodeForm.verifications || []}
            availableActions={verificationActions}
            onVerificationsChange={(newVerifications: NodeVerification[]) => 
              setNodeForm({ ...nodeForm, verifications: newVerifications })
            }
            loading={loadingVerifications}
            error={verificationError}
          />

          {gotoResult && (
            <Box sx={{ 
              p: 2, 
              bgcolor: gotoResult.includes('❌') || gotoResult.includes('⚠️') ? 'error.light' : 'success.light', 
              borderRadius: 1,
              maxHeight: 300,
              overflow: 'auto',
              mb: 1
            }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', whiteSpace: 'pre-line' }}>
                {gotoResult}
              </Typography>
            </Box>
          )}
          
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
          
          {/* Entry node note */}
          {nodeForm.type === 'entry' && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
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
          >
            Reset Node
          </Button>
        )}
        <Button 
          onClick={onSubmit} 
          variant="contained"
          disabled={!isFormValid()}
        >
          Save
        </Button>
        <Button 
          onClick={handleRunVerifications} 
          variant="contained"
          disabled={!canRunVerifications}
          sx={{ opacity: !canRunVerifications ? 0.5 : 1 }}
        >
          {isRunningVerifications ? 'Running...' : 'Run'}
        </Button>
        <Button 
          onClick={handleRunGoto} 
          variant="contained"
          color="primary"
          disabled={!canRunGoto}
          sx={{ 
            opacity: !canRunGoto ? 0.5 : 1,
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            }
          }}
        >
          {isRunningGoto ? 'Going...' : 'Go To'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 