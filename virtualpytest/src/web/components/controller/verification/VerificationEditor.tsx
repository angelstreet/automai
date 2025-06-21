import { Box, Typography, IconButton, Collapse } from '@mui/material';
import {
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from '@mui/icons-material';
import React from 'react';

import {
  VerificationEditorLayoutConfig,
  getVerificationEditorLayout,
} from '../../../config/layoutConfig';
import { useVerificationEditor } from '../../../hooks/verification/useVerificationEditor';
import { Host } from '../../../types/common/Host_Types';
import { VerificationsList } from '../../verification/VerificationsList';

import VerificationCapture from './VerificationCapture';
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

export const VerificationEditor: React.FC<VerificationEditorProps> = React.memo(
  ({
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
        <Box>
          {/* Collapsible toggle button and title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <IconButton
              size="small"
              onClick={() =>
                verification.setVerificationsCollapsed(!verification.verificationsCollapsed)
              }
              sx={{ p: 0.25 }}
            >
              {verification.verificationsCollapsed ? (
                <ArrowRightIcon sx={{ fontSize: '1rem' }} />
              ) : (
                <ArrowDownIcon sx={{ fontSize: '1rem' }} />
              )}
            </IconButton>
            <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
              Verifications
            </Typography>
          </Box>

          {/* Collapsible content */}
          <Collapse in={!verification.verificationsCollapsed}>
            <Box
              sx={{
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
              }}
            >
              <VerificationsList
                verifications={verification.verifications}
                availableVerifications={verification.availableVerificationTypes}
                onVerificationsChange={verification.handleVerificationsChange}
                loading={verification.loading}
                error={verification.error}
                model={verification.selectedHost?.device_model || ''}
                onTest={verification.handleTest}
                testResults={verification.testResults}
                reloadTrigger={verification.referenceSaveCounter}
                onReferenceSelected={verification.handleReferenceSelected}
                selectedHost={verification.selectedHost}
                modelReferences={React.useMemo(
                  () =>
                    verification.getModelReferences(verification.selectedHost?.device_model || ''),
                  [verification.getModelReferences, verification.selectedHost?.device_model],
                )}
                referencesLoading={verification.referencesLoading}
              />
            </Box>
          </Collapse>
        </Box>

        {/* =================== RESULT MODAL =================== */}
        <VerificationResultModal verification={verification} />
      </Box>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    const isVisibleChanged = prevProps.isVisible !== nextProps.isVisible;
    const selectedHostChanged =
      JSON.stringify(prevProps.selectedHost) !== JSON.stringify(nextProps.selectedHost);
    const captureSourcePathChanged = prevProps.captureSourcePath !== nextProps.captureSourcePath;
    const selectedAreaChanged =
      JSON.stringify(prevProps.selectedArea) !== JSON.stringify(nextProps.selectedArea);
    const isCaptureActiveChanged = prevProps.isCaptureActive !== nextProps.isCaptureActive;
    const layoutConfigChanged =
      JSON.stringify(prevProps.layoutConfig) !== JSON.stringify(nextProps.layoutConfig);
    const sxChanged = JSON.stringify(prevProps.sx) !== JSON.stringify(nextProps.sx);
    const onAreaSelectedChanged = prevProps.onAreaSelected !== nextProps.onAreaSelected;
    const onClearSelectionChanged = prevProps.onClearSelection !== nextProps.onClearSelection;

    // Only re-render if meaningful props have changed
    const shouldRerender =
      isVisibleChanged ||
      selectedHostChanged ||
      captureSourcePathChanged ||
      selectedAreaChanged ||
      isCaptureActiveChanged ||
      layoutConfigChanged ||
      sxChanged ||
      onAreaSelectedChanged ||
      onClearSelectionChanged;

    if (shouldRerender) {
      console.log('[@component:VerificationEditor] Props changed, re-rendering:', {
        isVisibleChanged,
        selectedHostChanged,
        captureSourcePathChanged,
        selectedAreaChanged,
        isCaptureActiveChanged,
        layoutConfigChanged,
        sxChanged,
        onAreaSelectedChanged,
        onClearSelectionChanged,
      });
    }

    return !shouldRerender; // Return true to skip re-render, false to re-render
  },
);

export default VerificationEditor;
