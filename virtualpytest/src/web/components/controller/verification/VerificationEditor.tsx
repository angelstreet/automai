import {
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import React from 'react';

import {
  VerificationEditorLayoutConfig,
  getVerificationEditorLayout,
} from '../../../config/layoutConfig';
import { useVerificationEditor } from '../../../hooks/verification/useVerificationEditor';
import { Host } from '../../../types/common/Host_Types';
import { VerificationsList } from '../../verification/VerificationsList';
import { getZIndex } from '../../../utils/zIndexUtils';

import VerificationCapture from './VerificationCapture';

interface DragArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VerificationEditorProps {
  isVisible: boolean;
  selectedHost: Host;
  selectedDeviceId: string;
  captureSourcePath?: string;
  selectedArea?: DragArea | null;
  onAreaSelected?: (area: DragArea) => void;
  onClearSelection?: () => void;
  isCaptureActive: boolean;
  isControlActive?: boolean;
  layoutConfig?: VerificationEditorLayoutConfig;
  sx?: any;
}

export const VerificationEditor: React.FC<VerificationEditorProps> = React.memo(
  ({
    isVisible,
    selectedHost,
    selectedDeviceId,
    captureSourcePath,
    selectedArea,
    onAreaSelected,
    onClearSelection,
    isCaptureActive,
    isControlActive = false,
    layoutConfig,
    sx = {},
  }) => {
    // Extract device from host devices array using selectedDeviceId
    const selectedDevice = React.useMemo(() => {
      return selectedHost?.devices?.find((device) => device.device_id === selectedDeviceId);
    }, [selectedHost, selectedDeviceId]);

    // Extract model from the selected device
    const model = selectedDevice?.device_model;

    // Use the provided layout config or get it from the model type
    const finalLayoutConfig = React.useMemo(() => {
      const config = layoutConfig || getVerificationEditorLayout(model || 'unknown');
      console.log('[@component:VerificationEditor] Layout config recalculated:', {
        selectedDeviceId,
        model,
        providedLayoutConfig: layoutConfig,
        calculatedConfig: config,
        isMobileModel: config.isMobileModel,
        width: config.width,
        height: config.height,
        captureHeight: config.captureHeight,
      });
      return config;
    }, [model, layoutConfig, selectedDeviceId]);

    // Use the verification editor hook to handle all verification logic
    const verification = useVerificationEditor({
      isVisible,
      selectedHost,
      selectedDeviceId,
      captureSourcePath,
      selectedArea,
      onAreaSelected,
      onClearSelection,
      isCaptureActive,
      isControlActive,
    });

    // Debug logging for component mount/unmount
    React.useEffect(() => {
      console.log('[@component:VerificationEditor] Component mounted with props:', {
        isVisible,
        selectedDeviceId,
        model,
        isCaptureActive,
        layoutConfig: finalLayoutConfig,
        selectedDevice: !!selectedDevice,
      });

      return () => {
        console.log('[@component:VerificationEditor] Component unmounting');
      };
    }, [isVisible, selectedDeviceId, model, isCaptureActive, finalLayoutConfig, selectedDevice]);

    if (!isVisible) return null;

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
        </Typography>

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
              {model && verification.selectedHost && (
                <VerificationsList
                  verifications={verification.verifications}
                  availableVerifications={verification.availableVerificationTypes}
                  onVerificationsChange={verification.handleVerificationsChange}
                  loading={verification.loading}
                  model={model}
                  onTest={verification.handleTest}
                  testResults={verification.testResults}
                  onReferenceSelected={verification.handleReferenceSelected}
                  selectedHost={verification.selectedHost}
                  modelReferences={verification.modelReferences}
                  referencesLoading={verification.referencesLoading}
                  showCollapsible={false}
                  title="Verifications"
                />
              )}
            </Box>
          </Collapse>
        </Box>

        {/* =================== CONFIRMATION DIALOG =================== */}
        <Dialog
          open={verification.showConfirmDialog}
          onClose={verification.handleCancelOverwrite}
          PaperProps={{
            sx: {
              backgroundColor: '#2E2E2E',
              color: '#ffffff',
              zIndex: getZIndex('VERIFICATION_EDITOR'),
            },
          }}
        >
          <DialogTitle sx={{ color: '#ffffff', fontSize: '1rem' }}>
            Warning: Overwrite Reference
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ color: '#ffffff', fontSize: '0.875rem' }}>
              A {verification.referenceType} reference named "{verification.referenceName}" already
              exists.
              <br />
              Do you want to overwrite it?
            </Typography>
          </DialogContent>
          <DialogActions sx={{ gap: 1, p: 2 }}>
            <Button
              onClick={verification.handleCancelOverwrite}
              variant="outlined"
              size="small"
              sx={{
                borderColor: '#666',
                color: '#ffffff',
                fontSize: '0.75rem',
                '&:hover': {
                  borderColor: '#888',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={verification.handleConfirmOverwrite}
              variant="contained"
              size="small"
              sx={{
                bgcolor: '#f44336',
                fontSize: '0.75rem',
                '&:hover': {
                  bgcolor: '#d32f2f',
                },
              }}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    const isVisibleChanged = prevProps.isVisible !== nextProps.isVisible;
    const selectedHostChanged =
      JSON.stringify(prevProps.selectedHost) !== JSON.stringify(nextProps.selectedHost);
    const selectedDeviceIdChanged = prevProps.selectedDeviceId !== nextProps.selectedDeviceId;
    const captureSourcePathChanged = prevProps.captureSourcePath !== nextProps.captureSourcePath;
    const selectedAreaChanged =
      JSON.stringify(prevProps.selectedArea) !== JSON.stringify(nextProps.selectedArea);
    const isCaptureActiveChanged = prevProps.isCaptureActive !== nextProps.isCaptureActive;
    const isControlActiveChanged = prevProps.isControlActive !== nextProps.isControlActive;
    const layoutConfigChanged =
      JSON.stringify(prevProps.layoutConfig) !== JSON.stringify(nextProps.layoutConfig);
    const sxChanged = JSON.stringify(prevProps.sx) !== JSON.stringify(nextProps.sx);
    const onAreaSelectedChanged = prevProps.onAreaSelected !== nextProps.onAreaSelected;
    const onClearSelectionChanged = prevProps.onClearSelection !== nextProps.onClearSelection;

    // Only re-render if meaningful props have changed
    const shouldRerender =
      isVisibleChanged ||
      selectedHostChanged ||
      selectedDeviceIdChanged ||
      captureSourcePathChanged ||
      selectedAreaChanged ||
      isCaptureActiveChanged ||
      isControlActiveChanged ||
      layoutConfigChanged ||
      sxChanged ||
      onAreaSelectedChanged ||
      onClearSelectionChanged;

    if (shouldRerender) {
      console.log('[@component:VerificationEditor] Props changed, re-rendering:', {
        isVisibleChanged,
        selectedHostChanged,
        selectedDeviceIdChanged,
        captureSourcePathChanged,
        selectedAreaChanged,
        isCaptureActiveChanged,
        isControlActiveChanged,
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
