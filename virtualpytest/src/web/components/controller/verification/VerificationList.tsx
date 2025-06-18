import React from 'react';
import { Box, Typography, Collapse, IconButton } from '@mui/material';
import {
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from '@mui/icons-material';
import { NodeVerificationsList } from '../../navigation/Navigation_NodeVerificationsList';
import { UseVerificationType } from '../../../hooks/verification/useVerification';

interface VerificationListProps {
  verification: UseVerificationType;
}

export const VerificationList: React.FC<VerificationListProps> = ({ verification }) => {
  const {
    availableVerificationTypes,
    verifications,
    loading,
    error,
    testResults,
    verificationsCollapsed,
    setVerificationsCollapsed,
    handleVerificationsChange,
    handleTest,
    referenceSaveCounter,
    handleReferenceSelected,
    selectedHost,
  } = verification;

  // Extract model from the selected host device
  const model = selectedHost?.device_model || '';

  return (
    <Box>
      {/* Verifications Section Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => setVerificationsCollapsed(!verificationsCollapsed)}
          sx={{ p: 0.25, mr: 0.5 }}
        >
          {verificationsCollapsed ? (
            <ArrowRightIcon sx={{ fontSize: '1rem' }} />
          ) : (
            <ArrowDownIcon sx={{ fontSize: '1rem' }} />
          )}
        </IconButton>
        <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
          Verifications
          {model && (
            <Typography
              component="span"
              sx={{ fontSize: '0.7rem', color: 'text.secondary', ml: 1 }}
            >
              ({verifications.length})
            </Typography>
          )}
        </Typography>
      </Box>

      {/* Collapsible Verifications Content */}
      <Collapse in={!verificationsCollapsed}>
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
          <NodeVerificationsList
            verifications={verifications}
            availableActions={availableVerificationTypes}
            onVerificationsChange={handleVerificationsChange}
            loading={loading}
            error={error}
            model={model}
            onTest={handleTest}
            testResults={testResults}
            reloadTrigger={referenceSaveCounter}
            onReferenceSelected={handleReferenceSelected}
            selectedHost={selectedHost}
          />
        </Box>
      </Collapse>
    </Box>
  );
};

export default VerificationList;
