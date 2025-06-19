import { Box, Typography } from '@mui/material';
import React from 'react';

import {
  VerificationEditorLayoutConfig,
  getVerificationEditorLayout,
} from '../../../config/layoutConfig';
import { useVerificationEditor } from '../../../hooks/verification/useVerificationEditor';
import { Host } from '../../../types/common/Host_Types';

import VerificationCapture from './VerificationCapture';
import VerificationList from './VerificationList';
import VerificationResultModal from './VerificationResultModal';

interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VerificationEditorProps {
  isVisible: boolean;
  selectedHost: Host;
  captureSourcePath?: string;
  selectedArea?: DragArea | null;
  onAreaSelected?: (area: DragArea) => void;
  onClearSelection?: () => void;
  isCaptureActive: boolean;
  layoutConfig?: VerificationEditorLayoutConfig;
  sx?: any;
}

export const VerificationEditor: React.FC<VerificationEditorProps> = ({
  isVisible,
  selectedHost,
  captureSourcePath,
  selectedArea,
  onAreaSelected,
  onClearSelection,
  isCaptureActive,
  layoutConfig,
  sx = {},
}) => {
  // Extract model from host device
  const model = selectedHost.device_model;

  // Use the provided layout config or get it from the model type
  const finalLayoutConfig = React.useMemo(() => {
    const config = layoutConfig || getVerificationEditorLayout(model);
    console.log('[@component:VerificationEditor] Layout config recalculated:', {
      model,
      providedLayoutConfig: layoutConfig,
      calculatedConfig: config,
      isMobileModel: config.isMobileModel,
      width: config.width,
      height: config.height,
      captureHeight: config.captureHeight,
    });
    return config;
  }, [model, layoutConfig]);

  // Use the verification editor hook to handle all verification logic
  const verification = useVerificationEditor({
    isVisible,
    selectedHost,
    captureSourcePath,
    selectedArea,
    onAreaSelected,
    onClearSelection,
    isCaptureActive,
  });

  // Debug logging for component mount/unmount
  React.useEffect(() => {
    console.log('[@component:VerificationEditor] Component mounted with props:', {
      isVisible,
      model,
      isCaptureActive,
      layoutConfig: finalLayoutConfig,
    });

    return () => {
      console.log('[@component:VerificationEditor] Component unmounting');
    };
  }, [isVisible, model, isCaptureActive, finalLayoutConfig]);

  if (!isVisible) return null;

  if (!model || model.trim() === '') {
    return (
      <Box
        sx={{
          width: finalLayoutConfig.width,
          height: finalLayoutConfig.height,
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          alignItems: 'center',
          justifyContent: 'center',
          ...sx,
        }}
      >
        <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600, color: 'error.main' }}>
          Configuration Error
        </Typography>
        <Typography variant="body2" sx={{ color: 'error.main', textAlign: 'center' }}>
          Device model is required for the Verification Editor
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: finalLayoutConfig.width,
        height: finalLayoutConfig.height,
        p: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
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
        ...sx,
      }}
    >
      <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
        Verification Editor
        <Typography component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: 1 }}>
          ({model}){' '}
          {!finalLayoutConfig.isMobileModel && (
            <Typography component="span" sx={{ fontSize: '0.7rem' }}>
              [Landscape]
            </Typography>
          )}
        </Typography>
      </Typography>

      {/* Show error message if any */}
      {verification.error && (
        <Typography variant="caption" sx={{ color: 'error.main', fontSize: '0.7rem' }}>
          {verification.error}
        </Typography>
      )}

      {/* =================== CAPTURE SECTION =================== */}
      <VerificationCapture
        verification={verification}
        selectedArea={selectedArea || null}
        onAreaSelected={onAreaSelected}
        captureHeight={finalLayoutConfig.captureHeight}
        isMobileModel={finalLayoutConfig.isMobileModel}
      />

      {/* =================== VERIFICATIONS SECTION =================== */}
      <VerificationList verification={verification} />

      {/* =================== RESULT MODAL =================== */}
      <VerificationResultModal verification={verification} />
    </Box>
  );
};

export default VerificationEditor;
