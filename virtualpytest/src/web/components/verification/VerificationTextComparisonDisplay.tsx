import { Box, Typography } from '@mui/material';
import React from 'react';

import { useHostManager } from '../../hooks/useHostManager';

interface VerificationTextComparisonDisplayProps {
  searchedText: string;
  extractedText: string;
  sourceUrl?: string;
  resultType: 'PASS' | 'FAIL' | 'ERROR';
  detectedLanguage?: string;
  languageConfidence?: number;
  onSourceImageClick: (
    searchedText: string,
    extractedText: string,
    sourceUrl?: string,
    resultType?: 'PASS' | 'FAIL' | 'ERROR',
    detectedLanguage?: string,
    languageConfidence?: number,
    imageFilter?: 'none' | 'greyscale' | 'binary',
  ) => void;
}

export const VerificationTextComparisonDisplay: React.FC<
  VerificationTextComparisonDisplayProps
> = ({
  searchedText,
  extractedText,
  sourceUrl,
  resultType,
  detectedLanguage,
  languageConfidence,
  onSourceImageClick,
}) => {
  // Use registration context to get selected host
  const { selectedHost } = useHostManager();

  // Process image URLs with HTTP to HTTPS proxy logic (same as ScreenshotCapture)
  const processImageUrl = (url: string): string => {
    if (!url) return '';

    console.log(`[@component:VerificationTextComparisonDisplay] Processing image URL: ${url}`);

    // Handle data URLs (base64) - return as is
    if (url.startsWith('data:')) {
      console.log('[@component:VerificationTextComparisonDisplay] Using data URL');
      return url;
    }

    // Handle HTTP URLs - use proxy to convert to HTTPS
    if (url.startsWith('http:')) {
      console.log('[@component:VerificationTextComparisonDisplay] HTTP URL detected, using proxy');
      // URL is already processed by backend
      const proxyUrl = url;
      console.log(
        `[@component:VerificationTextComparisonDisplay] Generated proxy URL: ${proxyUrl}`,
      );
      return proxyUrl;
    }

    // Handle HTTPS URLs - return as is (no proxy needed)
    if (url.startsWith('https:')) {
      console.log('[@component:VerificationTextComparisonDisplay] Using HTTPS URL directly');
      return url;
    }

    // For relative paths or other formats, use directly
    console.log('[@component:VerificationTextComparisonDisplay] Using URL directly');
    return url;
  };

  // Use centralized image URL builder
  const buildImageUrl = (url: string): string => {
    if (!selectedHost) return processImageUrl(url);
    // Process through HTTP proxy logic first, then apply any additional host-specific logic if needed
    return processImageUrl(url);
  };

  const handleSourceImageClick = () => {
    onSourceImageClick(
      searchedText,
      extractedText,
      sourceUrl ? buildImageUrl(sourceUrl) : undefined,
      resultType,
      detectedLanguage,
      languageConfidence,
      'none', // Default image filter for text verifications
    );
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

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        padding: '8px',
        border: `1px solid ${
          resultType === 'PASS' ? '#4caf50' : resultType === 'ERROR' ? '#ff9800' : '#f44336'
        }`,
        borderRadius: 1,
        backgroundColor: 'rgba(0,0,0,0.1)',
      }}
    >
      {sourceUrl && (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', mb: 0.5 }}>
            Source
          </Typography>
          <img
            src={buildImageUrl(sourceUrl)}
            alt="Source"
            onClick={handleSourceImageClick}
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'contain',
              border: '1px solid #666',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title="Click to view full size"
          />
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600 }}>
            Searched:
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              display: 'block',
              color: '#90caf9',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            "{searchedText}"
          </Typography>
        </Box>
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', fontWeight: 600 }}>
            Found:
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontSize: '0.7rem',
              display: 'block',
              color: resultType === 'PASS' ? '#4caf50' : '#f44336',
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            "{extractedText || 'No text found'}"
          </Typography>
        </Box>
        {/* Language detection information */}
        {detectedLanguage && languageConfidence !== undefined && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                color: '#ffb74d',
                fontWeight: 500,
              }}
            >
              {getLanguageName(detectedLanguage)}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                color: '#81c784',
                fontWeight: 500,
              }}
            >
              {(languageConfidence * 100).toFixed(1)}% confidence
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};
