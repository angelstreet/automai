import { Box, Typography } from '@mui/material';
import React from 'react';

import type { EdgeAction } from '../../types/controller/ActionTypes';

interface ActionTestResultsProps {
  testResult: EdgeAction;
}

export const ActionTestResults: React.FC<ActionTestResultsProps> = ({ testResult }) => {
  if (!testResult) {
    return null;
  }

  const getResultColor = () => {
    if (testResult.success || testResult.resultType === 'SUCCESS') {
      return '#4caf50'; // Green
    } else if (testResult.resultType === 'ERROR') {
      return '#ff9800'; // Orange
    } else {
      return '#f44336'; // Red
    }
  };

  const getResultIcon = () => {
    if (testResult.success || testResult.resultType === 'SUCCESS') {
      return '✅';
    } else if (testResult.resultType === 'ERROR') {
      return '⚠️';
    } else {
      return '❌';
    }
  };

  const getResultText = () => {
    if (testResult.message) {
      return testResult.message;
    } else if (testResult.error) {
      return testResult.error;
    } else if (testResult.success) {
      return 'Action executed successfully';
    } else {
      return 'Action failed';
    }
  };

  return (
    <Box
      sx={{
        mt: 0.5,
        p: 1,
        borderRadius: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
        border: `1px solid ${getResultColor()}`,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Typography sx={{ fontSize: '0.75rem' }}>{getResultIcon()}</Typography>
        <Typography
          sx={{
            fontSize: '0.75rem',
            color: getResultColor(),
            fontWeight: 500,
          }}
        >
          {getResultText()}
        </Typography>
      </Box>

      {testResult.executionTime && (
        <Typography
          sx={{
            fontSize: '0.65rem',
            color: 'text.secondary',
            mt: 0.25,
          }}
        >
          Execution time: {testResult.executionTime}ms
        </Typography>
      )}

      {testResult.executedAt && (
        <Typography
          sx={{
            fontSize: '0.65rem',
            color: 'text.secondary',
            mt: 0.25,
          }}
        >
          Executed at: {new Date(testResult.executedAt).toLocaleTimeString()}
        </Typography>
      )}
    </Box>
  );
};
