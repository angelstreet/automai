import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';
import React from 'react';

interface VerificationImageComparisonDialogProps {
  open: boolean;
  sourceUrl: string;
  referenceUrl: string;
  overlayUrl?: string;
  userThreshold?: number;
  matchingResult?: number;
  resultType?: 'PASS' | 'FAIL' | 'ERROR';
  imageFilter?: 'none' | 'greyscale' | 'binary';
  processImageUrl?: (url: string) => string;
  getCacheBustedUrl?: (url: string) => string;
  onClose: () => void;
}

export const VerificationImageComparisonDialog: React.FC<
  VerificationImageComparisonDialogProps
> = ({
  open,
  sourceUrl,
  referenceUrl,
  overlayUrl,
  resultType,
  imageFilter,
  matchingResult,
  userThreshold,
  processImageUrl = (url) => url,
  getCacheBustedUrl = (url) => `${url}${url.includes('?') ? '&' : '?'}cache=${Date.now()}`,
  onClose,
}) => {
  const getResultColor = () => {
    switch (resultType) {
      case 'PASS':
        return '#4caf50';
      case 'FAIL':
        return '#f44336';
      case 'ERROR':
        return '#ff9800';
      default:
        return '#757575';
    }
  };

  // Get CSS filter based on the selected filter
  const getCSSFilter = (filter?: 'none' | 'greyscale' | 'binary') => {
    switch (filter) {
      case 'greyscale':
        return 'grayscale(100%)';
      case 'binary':
        return 'grayscale(100%) contrast(1000%) brightness(1000%)';
      case 'none':
      default:
        return 'none';
    }
  };

  const processedSourceUrl = processImageUrl(sourceUrl);
  const processedReferenceUrl = processImageUrl(referenceUrl);
  const processedOverlayUrl = overlayUrl ? processImageUrl(overlayUrl) : '';
  const cacheBustedSourceUrl = getCacheBustedUrl(processedSourceUrl);
  const cacheBustedReferenceUrl = getCacheBustedUrl(processedReferenceUrl);
  const cacheBustedOverlayUrl = overlayUrl ? getCacheBustedUrl(processedOverlayUrl) : '';
  const cssFilter = getCSSFilter(imageFilter);

  // Debug logging for filters
  if (imageFilter && imageFilter !== 'none') {
    console.log(
      `[@component:VerificationImageComparisonDialog] Applying ${imageFilter} filter dynamically with CSS: ${cssFilter}`,
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          minHeight: '80vh',
          maxHeight: '90vh',
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Image Verification Comparison</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Confidence Display */}
            {matchingResult !== undefined && (
              <Typography
                variant="subtitle1"
                sx={{
                  color: '#2196f3',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  backgroundColor: 'transparent',
                  borderRadius: 1,
                }}
              >
                Confidence: {(matchingResult * 100).toFixed(1)}%
                {userThreshold !== undefined &&
                  ` (Threshold: ${(userThreshold * 100).toFixed(1)}%)`}
              </Typography>
            )}
            {resultType && (
              <Typography
                variant="subtitle1"
                sx={{
                  color: getResultColor(),
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  border: `2px solid ${getResultColor()}`,
                  borderRadius: 1,
                }}
              >
                {resultType}
              </Typography>
            )}
            {imageFilter && imageFilter !== 'none' && (
              <Typography
                variant="caption"
                sx={{
                  color: '#666',
                  padding: '2px 6px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                }}
              >
                Filter: {imageFilter} (CSS)
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ padding: 2 }}>
        {/* 3-Image Grid Layout */}
        <Box
          sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, minHeight: '400px' }}
        >
          {/* Source Image */}
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 1, textAlign: 'center', fontWeight: 'bold' }}>
              Source Image
            </Typography>
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                overflow: 'hidden',
                backgroundColor: 'transparent',
                border: '2px solid #ddd',
                borderRadius: 1,
                padding: 1,
              }}
            >
              <img
                src={cacheBustedSourceUrl}
                alt="Source"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  filter: cssFilter,
                }}
                onError={() => {
                  console.error(
                    '[@component:VerificationImageComparisonDialog] Failed to load source image:',
                    sourceUrl,
                  );
                }}
              />
            </Box>
          </Box>

          {/* Reference Image */}
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 1, textAlign: 'center', fontWeight: 'bold' }}>
              Reference Image
            </Typography>
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '300px',
                overflow: 'hidden',
                backgroundColor: 'transparent',
                border: '2px solid #ddd',
                borderRadius: 1,
                padding: 1,
              }}
            >
              <img
                src={cacheBustedReferenceUrl}
                alt="Reference"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  filter: cssFilter,
                }}
                onError={() => {
                  console.error(
                    '[@component:VerificationImageComparisonDialog] Failed to load reference image:',
                    referenceUrl,
                  );
                }}
              />
            </Box>
          </Box>

          {/* Pixel Difference Overlay */}
          {overlayUrl && (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ mb: 1, textAlign: 'center', fontWeight: 'bold' }}>
                Pixel Difference Overlay
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '300px',
                  overflow: 'hidden',
                  backgroundColor: 'transparent',
                  border: '2px solid #ddd',
                  borderRadius: 1,
                  padding: 1,
                }}
              >
                <img
                  src={cacheBustedOverlayUrl}
                  alt="Pixel Difference Overlay"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain',
                    filter: cssFilter,
                  }}
                  onError={() => {
                    console.error(
                      '[@component:VerificationImageComparisonDialog] Failed to load overlay image:',
                      overlayUrl,
                    );
                  }}
                />
              </Box>
            </Box>
          )}

          {/* If no overlay, show message in third column */}
          {!overlayUrl && (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ mb: 1, textAlign: 'center', fontWeight: 'bold' }}>
                Pixel Difference Overlay
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '300px',
                  backgroundColor: '#f9f9f9',
                  border: '2px dashed #ccc',
                  borderRadius: 1,
                  padding: 2,
                }}
              >
                <Typography variant="body2" sx={{ color: '#666', textAlign: 'center' }}>
                  No overlay image available
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
