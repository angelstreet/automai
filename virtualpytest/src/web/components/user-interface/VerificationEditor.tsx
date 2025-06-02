import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  TextField,
} from '@mui/material';
import { Camera as CameraIcon } from '@mui/icons-material';
import { NodeVerificationsList } from '../navigation/NodeVerificationsList';
import { DragSelectionOverlay } from './DragSelectionOverlay';

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
  sx = {},
}) => {
  const [verificationActions, setVerificationActions] = useState<VerificationActions>({});
  const [verifications, setVerifications] = useState<NodeVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedArea, setSelectedArea] = useState<DragArea | null>(null);
  const [referenceName, setReferenceName] = useState<string>('');
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

  const handleAreaSelected = (area: DragArea) => {
    console.log('[@component:VerificationEditor] Area selected:', area);
    setSelectedArea(area);
  };

  const handleClearSelection = () => {
    setSelectedArea(null);
    setCapturedReferenceImage(null);
  };

  const handleCaptureReference = async () => {
    if (!selectedArea || !captureSourcePath || !referenceName.trim()) {
      console.error('[@component:VerificationEditor] Missing requirements for capture');
      return;
    }

    console.log('[@component:VerificationEditor] Capturing reference:', {
      area: selectedArea,
      sourcePath: captureSourcePath,
      referenceName: referenceName.trim()
    });

    // TODO: Implement API call to crop and save reference image
    // For now, just show success
    setCapturedReferenceImage(`/tmp/model/${referenceName.trim()}.png`);
  };

  const canCapture = selectedArea && referenceName.trim() && captureSourcePath;
  const allowSelection = !isCaptureActive && captureSourcePath && captureImageRef;

  if (!isVisible) return null;

  return (
    <Box sx={{ 
      width: 480, 
      height: '100%', 
      p: 2, 
      display: 'flex', 
      flexDirection: 'column', 
      gap: 2,
      ...sx 
    }}>
      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>Verification Editor</Typography>
      
      {/* Screenshot Capture Section with Drag Selection */}
      <Box>
        <Box 
          ref={captureContainerRef}
          sx={{ 
            position: 'relative',
            width: '100%', 
            height: 120, 
            border: '2px dashed #444', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            mb: 1,
            borderRadius: 1,
            bgcolor: 'rgba(255,255,255,0.05)',
            overflow: 'hidden'
          }}
        >
          {/* Drag Selection Overlay */}
          {allowSelection && (
            <DragSelectionOverlay
              imageRef={captureImageRef}
              onAreaSelected={handleAreaSelected}
              selectedArea={selectedArea}
              sx={{ zIndex: 2 }}
            />
          )}

          {capturedReferenceImage ? (
            <img 
              src={capturedReferenceImage}
              alt="Reference"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
            />
          ) : (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
              {allowSelection ? 'Drag to select area' : 'No image captured'}
            </Typography>
          )}
        </Box>

        {/* Reference Name Input */}
        <TextField
          size="small"
          placeholder="Reference name"
          value={referenceName}
          onChange={(e) => setReferenceName(e.target.value)}
          sx={{
            mb: 1,
            '& .MuiInputBase-input': {
              fontSize: '0.75rem',
            },
          }}
          fullWidth
        />

        {/* Selection Info */}
        {selectedArea && (
          <Box sx={{ mb: 1, fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>
            <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
              Selected: x:{Math.round(selectedArea.x)}, y:{Math.round(selectedArea.y)}, w:{Math.round(selectedArea.width)}, h:{Math.round(selectedArea.height)}
            </Typography>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            size="small" 
            startIcon={<CameraIcon sx={{ fontSize: '1rem' }} />}
            variant="contained"
            onClick={handleCaptureReference}
            disabled={!canCapture}
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
            Capture
          </Button>
          
          {selectedArea && (
            <Button 
              size="small" 
              variant="outlined"
              onClick={handleClearSelection}
              sx={{
                borderColor: '#444',
                color: 'inherit',
                fontSize: '0.75rem',
                '&:hover': {
                  borderColor: '#666',
                }
              }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Box>

      {/* Verifications List */}
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