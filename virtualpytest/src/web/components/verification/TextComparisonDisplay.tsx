import React from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { useRegistration } from '../../contexts/RegistrationContext';

interface TextComparisonDisplayProps {
  searchedText: string;
  extractedText: string;
  sourceUrl?: string;
  resultType: 'PASS' | 'FAIL' | 'ERROR';
  detectedLanguage?: string;
  languageConfidence?: number;
  onSourceImageClick?: () => void;
}

export const TextComparisonDisplay: React.FC<TextComparisonDisplayProps> = ({
  searchedText,
  extractedText,
  sourceUrl,
  resultType,
  detectedLanguage,
  languageConfidence,
  onSourceImageClick,
}) => {
  // Use registration context to get selected host for nginx URL
  const { selectedHost, buildHostWebUrl } = useRegistration();

  const buildImageUrl = (url: string): string => {
    if (!url) return '';

    // If it's already a complete URL, return as is
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }

    // Use buildHostWebUrl from registration context
    if (selectedHost?.host_name) {
      const cleanUrl = url.startsWith('/') ? url : `/${url}`;
      return buildHostWebUrl(selectedHost.host_name, cleanUrl);
    }

    // Fallback if no host selected
    return url;
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
            onClick={onSourceImageClick}
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
