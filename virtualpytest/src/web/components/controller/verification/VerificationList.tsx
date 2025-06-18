import React from 'react';
import { Box, Collapse, IconButton } from '@mui/material';
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
      {/* Collapsible toggle button and content */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => setVerificationsCollapsed(!verificationsCollapsed)}
          sx={{ p: 0.25, mt: 0.5 }}
        >
          {verificationsCollapsed ? (
            <ArrowRightIcon sx={{ fontSize: '1rem' }} />
          ) : (
            <ArrowDownIcon sx={{ fontSize: '1rem' }} />
          )}
        </IconButton>

        <Box sx={{ flex: 1 }}>
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
      </Box>
    </Box>
  );
};

export default VerificationList;
