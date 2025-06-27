import React from 'react';
import { Box, Typography, FormControl, Select, MenuItem } from '@mui/material';

import { Verification } from '../../types/verification/Verification_Types';

interface VerificationResultsDisplayProps {
  testResults: Verification[];
  verifications: Verification[];
  passCondition?: 'all' | 'any';
  onPassConditionChange?: (condition: 'all' | 'any') => void;
  showPassConditionSelector?: boolean;
  compact?: boolean;
}

export const VerificationResultsDisplay: React.FC<VerificationResultsDisplayProps> = ({
  testResults,
  verifications,
  passCondition = 'all',
  onPassConditionChange,
  showPassConditionSelector = true,
  compact = false,
}) => {
  if (testResults.length === 0) {
    return null;
  }

  const finalPassed =
    passCondition === 'all'
      ? testResults.every((result) => result.success || result.resultType === 'PASS')
      : testResults.some((result) => result.success || result.resultType === 'PASS');

  // Helper function to render detailed ADB element info for PASS results
  const renderADBElementDetails = (result: Verification, verificationIndex: number) => {
    if (
      verifications[verificationIndex]?.verification_type !== 'adb' ||
      result.resultType !== 'PASS' ||
      !result.matches ||
      result.matches.length === 0
    ) {
      return null;
    }

    return (
      <Box sx={{ mt: 1, p: 1, backgroundColor: 'rgba(76, 175, 80, 0.05)', borderRadius: 1 }}>
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.7rem',
            fontWeight: 600,
            color: '#4caf50',
            display: 'block',
            mb: 1,
          }}
        >
          Found Elements ({result.total_matches || result.matches.length}):
        </Typography>

        {result.matches.map((match, matchIndex) => (
          <Box
            key={matchIndex}
            sx={{
              mb: matchIndex < result.matches!.length - 1 ? 1.5 : 0,
              p: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              borderRadius: 0.5,
              border: '1px solid rgba(76, 175, 80, 0.2)',
            }}
          >
            {/* Match Summary */}
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#2e7d32',
                display: 'block',
                mb: 0.5,
              }}
            >
              Element #{match.element_id} - {match.match_reason}
            </Typography>

            {/* Element Details Grid */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 0.5,
                fontSize: '0.65rem',
                '& > *:nth-of-type(odd)': {
                  fontWeight: 600,
                  color: 'text.secondary',
                  pr: 1,
                },
                '& > *:nth-of-type(even)': {
                  color: 'text.primary',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all',
                },
              }}
            >
              <span>ID:</span>
              <span>{match.full_element.id}</span>

              <span>Class:</span>
              <span>{match.full_element.className || '(empty)'}</span>

              <span>Text:</span>
              <span>{match.full_element.text || '(empty)'}</span>

              <span>Resource-ID:</span>
              <span>{match.full_element.resourceId || '(empty)'}</span>

              <span>Content-Desc:</span>
              <span>{match.full_element.contentDesc || '(empty)'}</span>

              <span>Bounds:</span>
              <span>{match.full_element.bounds || '(empty)'}</span>

              <span>Clickable:</span>
              <span>{match.full_element.clickable ? 'true' : 'false'}</span>

              <span>Enabled:</span>
              <span>{match.full_element.enabled ? 'true' : 'false'}</span>

              {match.full_element.tag && (
                <>
                  <span>Tag:</span>
                  <span>{match.full_element.tag}</span>
                </>
              )}
            </Box>

            {/* Show all matching attributes */}
            {match.all_matches && match.all_matches.length > 1 && (
              <Box sx={{ mt: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                    display: 'block',
                    mb: 0.5,
                  }}
                >
                  All Matches:
                </Typography>
                {match.all_matches.map((attrMatch, attrIndex) => (
                  <Typography
                    key={attrIndex}
                    variant="caption"
                    sx={{
                      fontSize: '0.6rem',
                      color: 'text.secondary',
                      display: 'block',
                      ml: 1,
                    }}
                  >
                    • {attrMatch.attribute}: "{attrMatch.value}"
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        ))}

        {/* Search Details */}
        <Typography
          variant="caption"
          sx={{
            fontSize: '0.65rem',
            color: 'text.secondary',
            display: 'block',
            mt: 1,
            fontStyle: 'italic',
          }}
        >
          Search: "{result.search_term}" (case-insensitive) • Wait time:{' '}
          {result.wait_time?.toFixed(1)}s
        </Typography>
      </Box>
    );
  };

  return (
    <Box>
      {/* Individual Test Results */}
      {!compact && (
        <Box sx={{ mb: 2 }}>
          {testResults.map((result, index) => (
            <Box
              key={index}
              sx={{
                mb: 1,
                px: 0.5,
                py: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                {/* Verification Label */}
                <Typography variant="body2" sx={{ flex: 1, fontSize: '0.8rem' }}>
                  {verifications[index]?.command || `Verification ${index + 1}`}
                </Typography>

                {/* Result Indicator */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    minWidth: 120,
                    padding: '4px 8px',
                    borderRadius: 1,
                    backgroundColor:
                      result.resultType === 'PASS'
                        ? 'rgba(76, 175, 80, 0.1)'
                        : result.resultType === 'ERROR'
                          ? 'rgba(255, 152, 0, 0.1)'
                          : 'rgba(244, 67, 54, 0.1)',
                    border: `1px solid ${
                      result.resultType === 'PASS'
                        ? '#4caf50'
                        : result.resultType === 'ERROR'
                          ? '#ff9800'
                          : '#f44336'
                    }`,
                  }}
                >
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor:
                        result.resultType === 'PASS'
                          ? '#4caf50'
                          : result.resultType === 'ERROR'
                            ? '#ff9800'
                            : '#f44336',
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.7rem',
                      color:
                        result.resultType === 'PASS'
                          ? '#4caf50'
                          : result.resultType === 'ERROR'
                            ? '#ff9800'
                            : '#f44336',
                      fontWeight: 600,
                    }}
                  >
                    {result.resultType || (result.success ? 'PASS' : 'FAIL')}
                  </Typography>

                  {/* Show threshold for image verifications */}
                  {verifications[index]?.verification_type === 'image' &&
                    result.threshold !== undefined && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          color: 'text.secondary',
                          ml: 0.5,
                        }}
                      >
                        {(result.threshold * 100).toFixed(1)}%
                      </Typography>
                    )}

                  {/* Show OCR confidence for text verifications */}
                  {verifications[index]?.verification_type === 'text' &&
                    result.ocrConfidence !== undefined && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: '0.65rem',
                          color: 'text.secondary',
                          ml: 0.5,
                        }}
                      >
                        {result.ocrConfidence.toFixed(1)}%
                      </Typography>
                    )}
                </Box>
              </Box>

              {/* Show message if available (skip for successful ADB verifications as they have detailed element info) */}
              {(result.message || result.error) &&
                !(
                  verifications[index]?.verification_type === 'adb' && result.resultType === 'PASS'
                ) && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.7rem',
                      color: 'text.secondary',
                      display: 'block',
                    }}
                  >
                    {result.message || result.error}
                  </Typography>
                )}

              {/* Show detailed ADB element info for PASS results */}
              {renderADBElementDetails(result, index)}
            </Box>
          ))}
        </Box>
      )}

      {/* Pass Condition Selector and Final Result */}
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mt: 2 }}>
        {showPassConditionSelector && onPassConditionChange && (
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <Select
              value={passCondition}
              onChange={(e) => onPassConditionChange(e.target.value as 'all' | 'any')}
              size="small"
              sx={{
                fontSize: '0.75rem',
                height: '30px',
                '& .MuiSelect-select': {
                  padding: '5px 10px',
                },
              }}
            >
              <MenuItem value="all" sx={{ fontSize: '0.75rem' }}>
                All must pass
              </MenuItem>
              <MenuItem value="any" sx={{ fontSize: '0.75rem' }}>
                Any can pass
              </MenuItem>
            </Select>
          </FormControl>
        )}

        {/* Final Result indicator */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            p: 1,
            borderRadius: 1,
            backgroundColor: finalPassed ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
            border: `1px solid ${finalPassed ? '#4caf50' : '#f44336'}`,
          }}
        >
          <Typography
            sx={{
              fontWeight: 'bold',
              color: finalPassed ? '#4caf50' : '#f44336',
              fontSize: compact ? '0.8rem' : '1rem',
            }}
          >
            Final Result: {finalPassed ? 'PASS' : 'FAIL'}
          </Typography>
          {!compact && (
            <Typography
              sx={{
                ml: 1,
                color: finalPassed ? '#4caf50' : '#f44336',
                fontSize: '0.9rem',
              }}
            >
              ({testResults.filter((r) => r.success || r.resultType === 'PASS').length}/
              {testResults.length} passed)
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};
