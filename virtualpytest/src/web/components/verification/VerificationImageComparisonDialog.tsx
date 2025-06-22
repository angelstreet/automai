import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
} from '@mui/material';

interface VerificationImageComparisonDialogProps {
  open: boolean;
  sourceUrl: string;
  referenceUrl: string;
  userThreshold?: number;
  matchingResult?: number;
  resultType?: 'PASS' | 'FAIL' | 'ERROR';
  imageFilter?: 'none' | 'greyscale' | 'binary';
  onClose: () => void;
}

export const VerificationImageComparisonDialog: React.FC<
  VerificationImageComparisonDialogProps
> = ({ open, sourceUrl, referenceUrl, resultType, imageFilter, onClose }) => {
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

  // Process image URLs with HTTP to HTTPS proxy logic (same as ScreenshotCapture)
  const processImageUrl = (url: string): string => {
    if (!url) return '';

    console.log(`[@component:VerificationImageComparisonDialog] Processing image URL: ${url}`);

    // Handle data URLs (base64) - return as is
    if (url.startsWith('data:')) {
      console.log('[@component:VerificationImageComparisonDialog] Using data URL');
      return url;
    }

    // Handle HTTP URLs - use proxy to convert to HTTPS
    if (url.startsWith('http:')) {
      console.log('[@component:VerificationImageComparisonDialog] HTTP URL detected, using proxy');
      const proxyUrl = `/server/av/proxy-image?url=${encodeURIComponent(url)}`;
      console.log(
        `[@component:VerificationImageComparisonDialog] Generated proxy URL: ${proxyUrl}`,
      );
      return proxyUrl;
    }

    // Handle HTTPS URLs - return as is (no proxy needed)
    if (url.startsWith('https:')) {
      console.log('[@component:VerificationImageComparisonDialog] Using HTTPS URL directly');
      return url;
    }

    // For relative paths or other formats, use directly
    console.log('[@component:VerificationImageComparisonDialog] Using URL directly');
    return url;
  };

  // Add cache-busting parameters to force browser to reload images
  const getCacheBustedUrl = (url: string) => {
    if (!url) return url;
    const timestamp = Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${timestamp}`;
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
  const cacheBustedSourceUrl = getCacheBustedUrl(processedSourceUrl);
  const cacheBustedReferenceUrl = getCacheBustedUrl(processedReferenceUrl);
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

      <DialogContent sx={{ padding: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.2, height: '100%', minHeight: '400px' }}>
          {/* Source Image */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 0.5, textAlign: 'center', fontWeight: 'bold' }}>
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
                border: 'none',
                padding: 0,
                margin: 0,
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
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  filter: cssFilter, // Apply dynamic CSS filter
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
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 0.5, textAlign: 'center', fontWeight: 'bold' }}>
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
                border: 'none',
                padding: 0,
                margin: 0,
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
                  backgroundColor: 'transparent',
                  border: 'none',
                  padding: 0,
                  margin: 0,
                  filter: cssFilter, // Apply dynamic CSS filter
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
