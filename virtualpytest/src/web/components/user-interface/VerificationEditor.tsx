import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
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

interface VerificationEditorProps {
  isVisible: boolean;
  isScreenshotMode: boolean;
  isCaptureActive: boolean;
  sx?: any;
}

export const VerificationEditor: React.FC<VerificationEditorProps> = ({
  isVisible,
  isScreenshotMode,
  isCaptureActive,
  sx = {},
}) => {
  const [verificationActions, setVerificationActions] = useState<VerificationActions>({});
  const [verifications, setVerifications] = useState<NodeVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleTakeScreenshot = async () => {
    // TODO: Implement screenshot functionality for verification
    console.log('[@component:VerificationEditor] Taking screenshot for verification');
  };

  const handleTestVerifications = async () => {
    if (verifications.length === 0) return;
    
    console.log('[@component:VerificationEditor] Testing verifications:', verifications);
    // TODO: Implement test functionality
  };

  const handleSaveVerifications = async () => {
    if (verifications.length === 0) return;
    
    console.log('[@component:VerificationEditor] Saving verifications:', verifications);
    // TODO: Implement save functionality
  };

  const canTest = verifications.length > 0 && verifications.some(v => v.id);
  const canSave = verifications.length > 0 && verifications.every(v => v.id && (!v.requiresInput || v.inputValue?.trim()));

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
      
      {/* Screenshot Capture Section */}
      <Box>
        <Box sx={{ 
          width: '100%', 
          height: 120, 
          border: '2px dashed #444', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          mb: 1,
          borderRadius: 1,
          bgcolor: 'rgba(255,255,255,0.05)'
        }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>
            No image captured
          </Typography>
        </Box>
        <Button 
          size="small" 
          startIcon={<CameraIcon sx={{ fontSize: '1rem' }} />}
          variant="outlined"
          fullWidth
          onClick={handleTakeScreenshot}
          sx={{
            borderColor: '#444',
            color: 'inherit',
            fontSize: '0.75rem',
            '&:hover': {
              borderColor: '#666',
            }
          }}
        >
          Capture
        </Button>
      </Box>

      {/* Verifications List - Using same component as NodeEditDialog */}
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
          onClick={handleTestVerifications}
          disabled={!canTest}
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
          onClick={handleSaveVerifications}
          disabled={!canSave}
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