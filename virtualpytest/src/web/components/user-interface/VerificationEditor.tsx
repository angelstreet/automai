import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Collapse,
  IconButton,
} from '@mui/material';
import { 
  Camera as CameraIcon,
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from '@mui/icons-material';
import { NodeVerificationsList } from '../navigation/NodeVerificationsList';

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

interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VerificationEditorProps {
  isVisible: boolean;
  isScreenshotMode: boolean;
  isCaptureActive: boolean;
  captureImageRef?: React.RefObject<HTMLImageElement>;
  captureImageDimensions?: { width: number; height: number };
  originalImageDimensions?: { width: number; height: number };
  captureSourcePath?: string;
  selectedArea?: DragArea | null;
  onAreaSelected?: (area: DragArea) => void;
  onClearSelection?: () => void;
  model: string;
  sx?: any;
}

export const VerificationEditor: React.FC<VerificationEditorProps> = ({
  isVisible,
  isScreenshotMode,
  isCaptureActive,
  captureImageRef,
  captureImageDimensions,
  originalImageDimensions,
  captureSourcePath,
  selectedArea,
  onAreaSelected,
  onClearSelection,
  model,
  sx = {},
}) => {
  const [verificationActions, setVerificationActions] = useState<VerificationActions>({});
  const [verifications, setVerifications] = useState<NodeVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState<string>('default_capture');
  const [capturedReferenceImage, setCapturedReferenceImage] = useState<string | null>(null);
  const [hasCaptured, setHasCaptured] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState<boolean>(false);
  const [pendingSave, setPendingSave] = useState<boolean>(false);
  
  // Collapsible sections state
  const [captureCollapsed, setCaptureCollapsed] = useState<boolean>(false);
  const [verificationsCollapsed, setVerificationsCollapsed] = useState<boolean>(false);

  const captureContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      fetchVerificationActions();
    }
  }, [isVisible]);

  useEffect(() => {
    if (!model || model.trim() === '') {
      console.error('[@component:VerificationEditor] Model prop is required but not provided');
      setError('Model is required for verification editor');
    } else {
      console.log(`[@component:VerificationEditor] Using model: ${model}`);
    }
  }, [model]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const fetchVerificationActions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:5009/api/virtualpytest/verification/actions');
      const result = await response.json();
      
      if (result.success) {
        setVerificationActions(result.verifications);
      } else {
        setError(result.error || 'Failed to load verification actions');
      }
    } catch (error) {
      console.error('Error fetching verification actions:', error);
      setError('Failed to connect to verification server');
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationsChange = (newVerifications: NodeVerification[]) => {
    setVerifications(newVerifications);
  };

  const handleClearSelection = () => {
    setCapturedReferenceImage(null);
    setHasCaptured(false);
    if (onClearSelection) {
      onClearSelection();
    }
  };

  const handleCaptureReference = async () => {
    if (!selectedArea) {
      console.error('[@component:VerificationEditor] Missing area selection for capture');
      return;
    }

    if (!captureSourcePath) {
      console.error('[@component:VerificationEditor] No capture source path available');
      return;
    }

    console.log('[@component:VerificationEditor] Capturing temporary reference:', {
      area: selectedArea,
      sourcePath: captureSourcePath,
    });

    try {
      // Always save as capture.png in /tmp folder (temporary capture)
      const response = await fetch('http://localhost:5009/api/virtualpytest/reference/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          area: selectedArea,
          source_path: captureSourcePath,
          reference_name: 'capture', // Always use 'capture' for temporary file
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const timestamp = new Date().getTime();
        const imageUrl = `http://localhost:5009/api/virtualpytest/reference/image/capture.png?t=${timestamp}`;
        console.log('[@component:VerificationEditor] Temporary capture created successfully, setting image URL:', imageUrl);
        setCapturedReferenceImage(imageUrl);
        setHasCaptured(true);
      } else {
        console.error('[@component:VerificationEditor] Failed to capture reference:', result.error);
      }
    } catch (error) {
      console.error('[@component:VerificationEditor] Error capturing reference:', error);
    }
  };

  const checkReferenceExists = async (referenceName: string, modelName: string): Promise<boolean> => {
    try {
      // Check if the reference already exists by trying to fetch it
      const response = await fetch(`http://localhost:5009/api/virtualpytest/reference/image/${modelName}/${referenceName}.png`);
      return response.ok;
    } catch (error) {
      // If there's an error fetching, assume it doesn't exist
      return false;
    }
  };

  const handleSaveReference = async () => {
    if (!model || model.trim() === '') {
      console.error('[@component:VerificationEditor] Cannot save: model is not provided');
      setError('Model is required to save references');
      return;
    }

    if (!hasCaptured || !referenceName.trim()) {
      console.error('[@component:VerificationEditor] Cannot save: no capture made or no reference name');
      return;
    }

    // Check if reference already exists
    const exists = await checkReferenceExists(referenceName.trim(), model.trim());
    
    if (exists) {
      // Show confirmation dialog
      setShowConfirmDialog(true);
      return;
    }

    // If doesn't exist, proceed with save
    await performSave();
  };

  const performSave = async () => {
    console.log('[@component:VerificationEditor] Saving reference:', {
      referenceName: referenceName.trim(),
      modelName: model.trim(),
    });

    setPendingSave(true);

    try {
      // Save the temporary capture.png with the proper reference name and model
      const response = await fetch('http://localhost:5009/api/virtualpytest/reference/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reference_name: referenceName.trim(),
          model_name: model.trim(),
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('[@component:VerificationEditor] Reference saved successfully');
        // Update the image URL to point to the saved reference
        const timestamp = new Date().getTime();
        const imageUrl = `http://localhost:5009/api/virtualpytest/reference/image/${model.trim()}/${referenceName.trim()}.png?t=${timestamp}`;
        setCapturedReferenceImage(imageUrl);
        // Clear any previous errors
        setError(null);
        // Show success message
        setSuccessMessage(`${referenceName.trim()} saved successfully`);
      } else {
        console.error('[@component:VerificationEditor] Failed to save reference:', result.error);
        setError(result.error || 'Failed to save reference');
      }
    } catch (error) {
      console.error('[@component:VerificationEditor] Error saving reference:', error);
      setError('Failed to save reference');
    } finally {
      setPendingSave(false);
    }
  };

  const handleConfirmOverwrite = async () => {
    setShowConfirmDialog(false);
    await performSave();
  };

  const handleCancelOverwrite = () => {
    setShowConfirmDialog(false);
  };

  const handleTest = () => {
    console.log('[@component:VerificationEditor] Running verification tests:', verifications);
    // TODO: Implement test functionality
  };

  const canCapture = selectedArea;
  const canSave = hasCaptured && referenceName.trim() && model && model.trim() !== '';
  const allowSelection = !isCaptureActive && captureSourcePath && captureImageRef;

  if (!isVisible) return null;

  if (!model || model.trim() === '') {
    return (
      <Box sx={{ 
        width: 440, 
        height: 520, 
        p: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        gap: 1,
        alignItems: 'center',
        justifyContent: 'center',
        ...sx 
      }}>
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: 'error.main' }}>
          Configuration Error
        </Typography>
        <Typography variant="body2" sx={{ color: 'error.main', textAlign: 'center' }}>
          Model prop is required for the Verification Editor
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      width: 440, 
      height: 520, 
      p: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 1,
      ...sx 
    }}>
      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
        Verification Editor
        <Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 1 }}>
          ({model})
        </Typography>
      </Typography>
      
      {/* Show error message if any */}
      {error && (
        <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
          {error}
        </Typography>
      )}

      {/* =================== CAPTURE SECTION =================== */}
      <Box>
        {/* Capture Section Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={() => setCaptureCollapsed(!captureCollapsed)}
            sx={{ p: 0.25, mr: 0.5 }}
          >
            {captureCollapsed ? (
              <ArrowRightIcon sx={{ fontSize: '1rem' }} />
            ) : (
              <ArrowDownIcon sx={{ fontSize: '1rem' }} />
            )}
          </IconButton>
          <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Capture
          </Typography>
        </Box>

        {/* Collapsible Capture Content */}
        <Collapse in={!captureCollapsed}>
          <Box>
            {/* 1. Capture Container (Reference Image Preview) */}
            <Box>
              <Box 
                ref={captureContainerRef}
                sx={{ 
                  position: 'relative',
                  width: '100%', 
                  height: 200, 
                  border: '2px dashed #444', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.05)',
                  overflow: 'hidden',
                  mb: 1.5
                }}
              >
                {capturedReferenceImage ? (
                  <>
                    <img 
                      src={capturedReferenceImage}
                      alt="Reference"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'fill'
                      }}
                    />
                    {/* Success message overlay */}
                    {successMessage && (
                      <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        zIndex: 10
                      }}>
                        <Typography variant="body2" sx={{ 
                          color: '#4caf50', 
                          fontSize: '0.9rem', 
                          fontWeight: 600,
                          textAlign: 'center',
                          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                        }}>
                          {successMessage}
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', textAlign: 'center', px: 0.5 }}>
                    {allowSelection ? 'Drag area on main image' : 'No image'}
                  </Typography>
                )}
              </Box>
            </Box>

            {/* 2. Drag Area Info (Selection Info) */}
            <Box sx={{ mb: 0.5 }}>
              {selectedArea ? (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0.5 }}>
                  <TextField
                    size="small"
                    label="X"
                    type="number"
                    value={Math.round(selectedArea.x)}
                    onChange={(e) => {
                      const newX = parseFloat(e.target.value) || 0;
                      if (onAreaSelected) {
                        onAreaSelected({
                          ...selectedArea,
                          x: newX
                        });
                      }
                    }}
                    sx={{
                      height: '28px',
                      '& .MuiInputBase-root': {
                        height: '28px',
                        minHeight: '28px',
                        maxHeight: '28px',
                        overflow: 'hidden',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        height: '100%',
                        boxSizing: 'border-box',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.7rem',
                        transform: 'translate(14px, 6px) scale(1)',
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    label="Y"
                    type="number"
                    value={Math.round(selectedArea.y)}
                    onChange={(e) => {
                      const newY = parseFloat(e.target.value) || 0;
                      if (onAreaSelected) {
                        onAreaSelected({
                          ...selectedArea,
                          y: newY
                        });
                      }
                    }}
                    sx={{
                      height: '28px',
                      '& .MuiInputBase-root': {
                        height: '28px',
                        minHeight: '28px',
                        maxHeight: '28px',
                        overflow: 'hidden',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        height: '100%',
                        boxSizing: 'border-box',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.7rem',
                        transform: 'translate(14px, 6px) scale(1)',
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    label="Width"
                    type="number"
                    value={Math.round(selectedArea.width)}
                    onChange={(e) => {
                      const newWidth = parseFloat(e.target.value) || 0;
                      if (onAreaSelected) {
                        onAreaSelected({
                          ...selectedArea,
                          width: newWidth
                        });
                      }
                    }}
                    sx={{
                      height: '28px',
                      '& .MuiInputBase-root': {
                        height: '28px',
                        minHeight: '28px',
                        maxHeight: '28px',
                        overflow: 'hidden',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        height: '100%',
                        boxSizing: 'border-box',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.7rem',
                        transform: 'translate(14px, 6px) scale(1)',
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    label="Height"
                    type="number"
                    value={Math.round(selectedArea.height)}
                    onChange={(e) => {
                      const newHeight = parseFloat(e.target.value) || 0;
                      if (onAreaSelected) {
                        onAreaSelected({
                          ...selectedArea,
                          height: newHeight
                        });
                      }
                    }}
                    sx={{
                      height: '28px',
                      '& .MuiInputBase-root': {
                        height: '28px',
                        minHeight: '28px',
                        maxHeight: '28px',
                        overflow: 'hidden',
                      },
                      '& .MuiInputBase-input': {
                        fontSize: '0.7rem',
                        padding: '2px 8px',
                        height: '100%',
                        boxSizing: 'border-box',
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '0.7rem',
                        transform: 'translate(14px, 6px) scale(1)',
                        '&.Mui-focused, &.MuiFormLabel-filled': {
                          transform: 'translate(14px, -9px) scale(0.75)',
                        },
                      },
                    }}
                  />
                </Box>
              ) : (
                <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>
                  No area selected
                </Typography>
              )}
            </Box>

            {/* 3. Reference Name + Action Buttons */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 0.5 }}>
              {/* Reference Name Input */}
              <TextField
                size="small"
                placeholder="Reference name"
                value={referenceName}
                onChange={(e) => setReferenceName(e.target.value)}
                sx={{
                  flex: 1,
                  '& .MuiInputBase-input': {
                    fontSize: '0.75rem',
                  },
                }}
              />

              {/* Action Buttons */}
              <Button 
                size="small" 
                startIcon={<CameraIcon sx={{ fontSize: '1rem' }} />}
                variant="contained"
                onClick={handleCaptureReference}
                disabled={!canCapture}
                sx={{
                  bgcolor: '#1976d2',
                  fontSize: '0.75rem',
                  '&:hover': {
                    bgcolor: '#1565c0',
                  },
                  '&:disabled': {
                    bgcolor: '#333',
                    color: 'rgba(255,255,255,0.3)',
                  }
                }}
              >
                Capture
              </Button>
              
              <Button 
                size="small" 
                variant="contained"
                onClick={handleSaveReference}
                disabled={!canSave || pendingSave}
                sx={{
                  bgcolor: '#4caf50',
                  fontSize: '0.75rem',
                  '&:hover': {
                    bgcolor: '#45a049',
                  },
                  '&:disabled': {
                    bgcolor: '#333',
                    color: 'rgba(255,255,255,0.3)',
                  }
                }}
              >
                {pendingSave ? 'Saving...' : 'Save'}
              </Button>
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* =================== VERIFICATIONS SECTION =================== */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Verifications Section Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
          <IconButton 
            size="small" 
            onClick={() => setVerificationsCollapsed(!verificationsCollapsed)}
            sx={{ p: 0.25, mr: 0.5 }}
          >
            {verificationsCollapsed ? (
              <ArrowRightIcon sx={{ fontSize: '1rem' }} />
            ) : (
              <ArrowDownIcon sx={{ fontSize: '1rem' }} />
            )}
          </IconButton>
          <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
            Verifications
            {model && (
              <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.secondary', ml: 1 }}>
                ({verifications.length})
              </Typography>
            )}
          </Typography>
        </Box>

        {/* Collapsible Verifications Content */}
        <Collapse in={!verificationsCollapsed} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ 
            flex: 1, 
            overflow: 'hidden', 
            display: 'flex', 
            flexDirection: 'column',
            '& .MuiTypography-subtitle2': {
              fontSize: '0.75rem',
            },
            '& .MuiButton-root': {
              fontSize: '0.7rem',
            },
            '& .MuiTextField-root': {
              '& .MuiInputLabel-root': {
                fontSize: '0.75rem',
              },
              '& .MuiInputBase-input': {
                fontSize: '0.75rem',
              },
            },
            '& .MuiSelect-root': {
              fontSize: '0.75rem',
            },
            '& .MuiFormControl-root': {
              '& .MuiInputLabel-root': {
                fontSize: '0.75rem',
              },
            },
          }}>
            <Box sx={{ 
              height: verificationsCollapsed ? 0 : '220px', 
              overflowY: 'auto',
              overflowX: 'hidden',
              transition: 'height 0.3s ease',
              '&::-webkit-scrollbar': {
                width: '6px',
              },
              '&::-webkit-scrollbar-track': {
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '3px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: 'rgba(255,255,255,0.3)',
                borderRadius: '3px',
                '&:hover': {
                  background: 'rgba(255,255,255,0.5)',
                },
              },
            }}>
              <NodeVerificationsList
                verifications={verifications}
                availableActions={verificationActions}
                onVerificationsChange={handleVerificationsChange}
                loading={loading}
                error={error}
                model={model}
                onTest={handleTest}
              />
            </Box>
          </Box>
        </Collapse>
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        open={showConfirmDialog}
        onClose={handleCancelOverwrite}
        PaperProps={{
          sx: {
            backgroundColor: '#2E2E2E',
            color: '#ffffff',
          }
        }}
      >
        <DialogTitle sx={{ color: '#ffffff', fontSize: '1rem' }}>
          Warning: Overwrite Reference
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#ffffff', fontSize: '0.875rem' }}>
            A reference image named "{referenceName}" already exists for model "{model}".
            Do you want to overwrite it?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ gap: 1, p: 2 }}>
          <Button 
            onClick={handleCancelOverwrite}
            variant="outlined"
            size="small"
            sx={{
              borderColor: '#666',
              color: '#ffffff',
              fontSize: '0.75rem',
              '&:hover': {
                borderColor: '#888',
                backgroundColor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmOverwrite}
            variant="contained"
            size="small"
            sx={{
              bgcolor: '#f44336',
              fontSize: '0.75rem',
              '&:hover': {
                bgcolor: '#d32f2f',
              }
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VerificationEditor; 