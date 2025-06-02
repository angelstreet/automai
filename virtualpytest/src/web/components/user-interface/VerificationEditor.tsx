import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
} from '@mui/material';
import { Camera as CameraIcon } from '@mui/icons-material';
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
  sx = {},
}) => {
  const [verificationActions, setVerificationActions] = useState<VerificationActions>({});
  const [verifications, setVerifications] = useState<NodeVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState<string>('default_capture');
  const [capturedReferenceImage, setCapturedReferenceImage] = useState<string | null>(null);

  const captureContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      fetchVerificationActions();
    }
  }, [isVisible]);

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
    if (onClearSelection) {
      onClearSelection();
    }
  };

  const handleCaptureReference = async () => {
    if (!selectedArea ||  !referenceName.trim()) {
      console.error('[@component:VerificationEditor] Missing requirements for capture');
      return;
    }

    if (!captureSourcePath) {
      console.error('[@component:VerificationEditor] No capture source path available');
      return;
    }

    if (!referenceName.trim()) {
      console.error('[@component:VerificationEditor] No reference name provided, using default');
      setReferenceName('default_reference');
    }

    console.log('[@component:VerificationEditor] Capturing reference:', {
      area: selectedArea,
      sourcePath: captureSourcePath,
      referenceName: referenceName.trim() || 'default_reference'
    });

    try {
      // Call the API to crop and save the reference image
      const response = await fetch('http://localhost:5009/api/virtualpytest/reference/capture', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          area: selectedArea,
          source_path: captureSourcePath,
          reference_name: referenceName.trim() || 'default_reference',
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        const timestamp = new Date().getTime();
        const imageUrl = `http://localhost:5009/api/virtualpytest/reference/image/${referenceName.trim() || 'default_reference'}.png?t=${timestamp}`;
        console.log('[@component:VerificationEditor] Reference captured successfully, setting image URL:', imageUrl);
        setCapturedReferenceImage(imageUrl);
      } else {
        console.error('[@component:VerificationEditor] Failed to capture reference:', result.error);
        // Could add error state handling here
      }
    } catch (error) {
      console.error('[@component:VerificationEditor] Error capturing reference:', error);
    }
  };

  const canCapture = selectedArea;
  const allowSelection = !isCaptureActive && captureSourcePath && captureImageRef;

  if (!isVisible) return null;

  return (
    <Box sx={{ 
      width: 400, 
      height: 520, 
      p: 1, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 1,
      ...sx 
    }}>
      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>Verification Editor</Typography>
      
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
            mb: 0.5
          }}
        >
          {capturedReferenceImage ? (
            <img 
              src={capturedReferenceImage}
              alt="Reference"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'fill'
              }}
            />
          ) : (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.65rem', textAlign: 'center', px: 0.5 }}>
              {allowSelection ? 'Drag area on main image' : 'No image'}
            </Typography>
          )}
        </Box>
      </Box>

      {/* 2. Drag Area Info (Selection Info) */}
      <Box sx={{ mb: 0 }}>
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
                '& .MuiInputBase-root': {
                  height: '32px',
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.7rem',
                  padding: '6px 8px',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.7rem',
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
                '& .MuiInputBase-input': {
                  fontSize: '0.7rem',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.7rem',
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
                '& .MuiInputBase-input': {
                  fontSize: '0.7rem',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.7rem',
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
                '& .MuiInputBase-input': {
                  fontSize: '0.7rem',
                },
                '& .MuiInputLabel-root': {
                  fontSize: '0.7rem',
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

      {/* 3. Reference Name + Action Buttons (Horizontal Row) */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end', mb: 0 }}>
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
          variant="outlined"
          onClick={handleClearSelection}
          disabled={!selectedArea}
          sx={{
            borderColor: '#444',
            color: 'inherit',
            fontSize: '0.75rem',
            '&:hover': {
              borderColor: '#666',
            },
            '&:disabled': {
              borderColor: '#333',
              color: 'rgba(255,255,255,0.3)',
            }
          }}
        >
          Clear
        </Button>
      </Box>

      {/* 4. Verifications List */}
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
          height: '220px', 
          overflowY: 'auto',
          overflowX: 'hidden',
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
          />
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1, mt: 'auto' }}>
        <Button 
          variant="outlined" 
          size="small"
          disabled={verifications.length === 0}
          sx={{
            borderColor: '#444',
            color: 'inherit',
            fontSize: '0.75rem',
            '&:hover': {
              borderColor: '#666',
            },
            '&:disabled': {
              borderColor: '#333',
              color: 'rgba(255,255,255,0.3)',
            }
          }}
        >
          Test
        </Button>
        <Button 
          variant="contained" 
          size="small"
          disabled={verifications.length === 0}
          sx={{
            bgcolor: '#444',
            fontSize: '0.75rem',
            '&:hover': {
              bgcolor: '#555',
            },
            '&:disabled': {
              bgcolor: '#333',
              color: 'rgba(255,255,255,0.3)',
            }
          }}
        >
          Save
        </Button>
      </Box>
    </Box>
  );
};

export default VerificationEditor; 