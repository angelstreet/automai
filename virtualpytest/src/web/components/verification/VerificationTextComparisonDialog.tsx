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

interface VerificationTextComparisonDialogProps {
  open: boolean;
  searchedText: string;
  extractedText: string;
  sourceUrl?: string;
  resultType?: 'PASS' | 'FAIL' | 'ERROR';
  detectedLanguage?: string;
  languageConfidence?: number;
  imageFilter?: 'none' | 'greyscale' | 'binary';
  onClose: () => void;
}

export const VerificationTextComparisonDialog: React.FC<VerificationTextComparisonDialogProps> = ({
  open,
  searchedText,
  extractedText,
  sourceUrl,
  resultType,
  detectedLanguage,
  languageConfidence,
  imageFilter,
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

  // Add cache-busting parameters to force browser to reload images
  const getCacheBustedUrl = (url: string) => {
    if (!url) return url;
    const timestamp = Date.now();
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}t=${timestamp}`;
  };

  // Process image URLs with HTTP to HTTPS proxy logic (same as ScreenshotCapture)
  const processImageUrl = (url: string): string => {
    if (!url) return '';

    console.log(`[@component:VerificationTextComparisonDialog] Processing image URL: ${url}`);

    // Handle data URLs (base64) - return as is
    if (url.startsWith('data:')) {
      console.log('[@component:VerificationTextComparisonDialog] Using data URL');
      return url;
    }

    // Handle HTTP URLs - use proxy to convert to HTTPS
    if (url.startsWith('http:')) {
      console.log('[@component:VerificationTextComparisonDialog] HTTP URL detected, using proxy');
      // URL is already processed by backend
      const proxyUrl = url;
      console.log(`[@component:VerificationTextComparisonDialog] Generated proxy URL: ${proxyUrl}`);
      return proxyUrl;
    }

    // Handle HTTPS URLs - return as is (no proxy needed)
    if (url.startsWith('https:')) {
      console.log('[@component:VerificationTextComparisonDialog] Using HTTPS URL directly');
      return url;
    }

    // For relative paths or other formats, use directly
    console.log('[@component:VerificationTextComparisonDialog] Using URL directly');
    return url;
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

  // Map language codes to readable names
  const getLanguageName = (langCode: string) => {
    const languageMap: { [key: string]: string } = {
      eng: 'English',
      fra: 'French',
      ita: 'Italian',
      deu: 'German',
      spa: 'Spanish',
      por: 'Portuguese',
      rus: 'Russian',
      jpn: 'Japanese',
      chi: 'Chinese',
      kor: 'Korean',
    };
    return languageMap[langCode] || langCode.toUpperCase();
  };

  const processedSourceUrl = processImageUrl(sourceUrl || '');
  const cacheBustedSourceUrl = getCacheBustedUrl(processedSourceUrl);
  const cssFilter = getCSSFilter(imageFilter);

  // Debug logging for filters
  if (imageFilter && imageFilter !== 'none') {
    console.log(
      `[@component:VerificationTextComparisonDialog] Applying ${imageFilter} filter dynamically with CSS: ${cssFilter}`,
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
          <Typography variant="h6">Text Verification Comparison</Typography>
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
                  backgroundColor: 'transparent',
                  borderRadius: 1,
                }}
              >
                Filter: {imageFilter} (CSS)
              </Typography>
            )}
            {detectedLanguage && languageConfidence !== undefined && (
              <Typography
                variant="caption"
                sx={{
                  color: '#ffb74d',
                  padding: '2px 6px',
                  backgroundColor: 'transparent',
                  borderRadius: 1,
                  fontWeight: 500,
                }}
              >
                {getLanguageName(detectedLanguage)} ({(languageConfidence * 100).toFixed(1)}%)
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ padding: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, height: '100%', minHeight: '400px' }}>
          {/* Source Image (if available) */}
          {sourceUrl && (
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
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
                  border: '1px solid #ddd',
                  borderRadius: 1,
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
                    filter: cssFilter, // Apply dynamic CSS filter
                  }}
                  onError={() => {
                    console.error(
                      '[@component:VerificationTextComparisonDialog] Failed to load source image:',
                      sourceUrl,
                    );
                  }}
                />
              </Box>
            </Box>
          )}

          {/* Text Comparison */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" sx={{ mb: 1, textAlign: 'center', fontWeight: 'bold' }}>
              Text Comparison
            </Typography>
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                padding: 2,
                border: '1px solid #ddd',
                borderRadius: 1,
                backgroundColor: 'rgba(0,0,0,0.05)',
                minHeight: '300px',
              }}
            >
              {/* Searched Text */}
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ fontSize: '1rem', fontWeight: 600, mb: 1, color: '#90caf9' }}
                >
                  Searched Text:
                </Typography>
                <Box
                  sx={{
                    padding: 2,
                    backgroundColor: 'rgba(144, 202, 249, 0.1)',
                    border: '1px solid #90caf9',
                    borderRadius: 1,
                    minHeight: '80px',
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: '#90caf9',
                      fontSize: '0.9rem',
                    }}
                  >
                    "{searchedText}"
                  </Typography>
                </Box>
              </Box>

              {/* Found Text */}
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontSize: '1rem',
                    fontWeight: 600,
                    mb: 1,
                    color: resultType === 'PASS' ? '#4caf50' : '#f44336',
                  }}
                >
                  Found Text:
                </Typography>
                <Box
                  sx={{
                    padding: 2,
                    backgroundColor:
                      resultType === 'PASS' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                    border: `1px solid ${resultType === 'PASS' ? '#4caf50' : '#f44336'}`,
                    borderRadius: 1,
                    minHeight: '80px',
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      color: resultType === 'PASS' ? '#4caf50' : '#f44336',
                      fontSize: '0.9rem',
                    }}
                  >
                    "{extractedText || 'No text found'}"
                  </Typography>
                </Box>
              </Box>
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
