import { Box, Typography } from '@mui/material';
import React from 'react';

import { Verification } from '../../types/verification/VerificationTypes';

import { VerificationImageComparisonThumbnails } from './VerificationImageComparisonThumbnails';
import { VerificationTextComparisonDisplay } from './VerificationTextComparisonDisplay';

interface VerificationTestResultsProps {
  verification: Verification;
  testResult: Verification;
  onImageClick: (
    sourceUrl: string,
    referenceUrl: string,
    userThreshold?: number,
    matchingResult?: number,
    resultType?: 'PASS' | 'FAIL' | 'ERROR',
    imageFilter?: 'none' | 'greyscale' | 'binary',
  ) => void;
  onSourceImageClick: (sourceUrl: string, resultType: 'PASS' | 'FAIL' | 'ERROR') => void;
}

export const VerificationTestResults: React.FC<VerificationTestResultsProps> = ({
  verification,
  testResult,
  onImageClick,
  onSourceImageClick,
}) => {
  return (
    <Box sx={{ mt: 0 }}>
      {/* Universal Test Result Status Indicator - shows for ALL verification types */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          minWidth: 120,
          padding: '4px 8px',
          borderRadius: 1,
          mb: 1,
          backgroundColor:
            testResult.resultType === 'PASS' || testResult.success
              ? 'rgba(76, 175, 80, 0.1)'
              : testResult.resultType === 'ERROR'
                ? 'rgba(255, 152, 0, 0.1)'
                : 'rgba(244, 67, 54, 0.1)',
          border: `2px solid ${
            testResult.resultType === 'PASS' || testResult.success
              ? '#4caf50'
              : testResult.resultType === 'ERROR'
                ? '#ff9800'
                : '#f44336'
          }`,
        }}
      >
        <Typography
          sx={{
            fontWeight: 'bold',
            fontSize: '0.75rem',
            color:
              testResult.resultType === 'PASS' || testResult.success
                ? '#4caf50'
                : testResult.resultType === 'ERROR'
                  ? '#ff9800'
                  : '#f44336',
          }}
        >
          {testResult.resultType === 'PASS' || testResult.success
            ? 'PASS'
            : testResult.resultType === 'ERROR'
              ? 'ERROR'
              : 'FAIL'}
        </Typography>

        {/* Display message within the same status box */}
        {(testResult.message || testResult.error) && (
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 500,
              color:
                testResult.resultType === 'PASS' || testResult.success
                  ? '#4caf50'
                  : testResult.resultType === 'ERROR'
                    ? '#ff9800'
                    : '#f44336',
              ml: 1,
            }}
          >
            {testResult.message || testResult.error}
          </Typography>
        )}
      </Box>

      {/* Image comparison thumbnails for image verifications */}
      {verification.verification_type === 'image' &&
        (testResult.sourceImageUrl || testResult.referenceImageUrl) && (
          <VerificationImageComparisonThumbnails
            sourceUrl={testResult.sourceImageUrl || ''}
            referenceUrl={testResult.referenceImageUrl || ''}
            resultType={testResult.resultType || (testResult.success ? 'PASS' : 'FAIL')}
            userThreshold={verification.params?.threshold}
            matchingResult={testResult.threshold}
            imageFilter={verification.params?.image_filter || 'none'}
            onImageClick={onImageClick}
          />
        )}

      {/* Text comparison for text verifications */}
      {verification.verification_type === 'text' &&
        (testResult.searchedText || testResult.sourceImageUrl) && (
          <VerificationTextComparisonDisplay
            searchedText={testResult.searchedText || verification.params?.text || ''}
            extractedText={testResult.extractedText || ''}
            sourceUrl={testResult.sourceImageUrl}
            resultType={testResult.resultType || (testResult.success ? 'PASS' : 'FAIL')}
            detectedLanguage={testResult.detectedLanguage}
            languageConfidence={testResult.languageConfidence}
            onSourceImageClick={onSourceImageClick}
          />
        )}

      {/* ADB element details for ADB verifications */}
      {verification.verification_type === 'adb' && testResult && (
        <Box
          sx={{
            mt: 1,
            p: 1,
            bgcolor: testResult.success ? 'rgba(76, 175, 80, 0.05)' : 'rgba(244, 67, 54, 0.05)',
            borderRadius: 1,
            border: `1px solid ${testResult.success ? 'rgba(76, 175, 80, 0.3)' : 'rgba(244, 67, 54, 0.3)'}`,
          }}
        >
          {testResult.success && testResult.matches ? (
            <>
              <Typography
                variant="caption"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  color: '#4caf50',
                  display: 'block',
                  mb: 0.5,
                }}
              >
                Found {testResult.total_matches} element(s) after {testResult.wait_time?.toFixed(1)}
                s
              </Typography>

              {testResult.matches?.map((match: any, matchIndex: number) => (
                <Box
                  key={matchIndex}
                  sx={{
                    mb: 1,
                    p: 0.5,
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 0.5,
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.65rem',
                      fontWeight: 600,
                      display: 'block',
                    }}
                  >
                    Element {match.element_id}: {match.match_reason}
                  </Typography>

                  {match.full_element && (
                    <Box sx={{ mt: 0.5, fontSize: '0.6rem', color: 'text.secondary' }}>
                      {match.full_element.text && match.full_element.text !== '<no text>' && (
                        <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
                          <strong>Text:</strong> {match.full_element.text}
                        </Typography>
                      )}
                      {match.full_element.contentDesc &&
                        match.full_element.contentDesc !== '<no content-desc>' && (
                          <Typography
                            variant="caption"
                            sx={{ fontSize: '0.6rem', display: 'block' }}
                          >
                            <strong>Content-Desc:</strong> {match.full_element.contentDesc}
                          </Typography>
                        )}
                      {match.full_element.resourceId &&
                        match.full_element.resourceId !== '<no resource-id>' && (
                          <Typography
                            variant="caption"
                            sx={{ fontSize: '0.6rem', display: 'block' }}
                          >
                            <strong>Resource-ID:</strong> {match.full_element.resourceId}
                          </Typography>
                        )}
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
                        <strong>Class:</strong> {match.full_element.className || 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
                        <strong>Bounds:</strong> {match.full_element.bounds || 'N/A'}
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', display: 'block' }}>
                        <strong>Clickable:</strong> {match.full_element.clickable ? 'Yes' : 'No'} |
                        <strong> Enabled:</strong> {match.full_element.enabled ? 'Yes' : 'No'}
                      </Typography>
                    </Box>
                  )}
                </Box>
              ))}
            </>
          ) : (
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#f44336',
                display: 'block',
              }}
            >
              ADB verification failed
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};
