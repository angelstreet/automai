import {
  KeyboardArrowDown as ArrowDownIcon,
  KeyboardArrowRight as ArrowRightIcon,
} from '@mui/icons-material';
import { Box, Collapse, IconButton, Typography } from '@mui/material';
import React from 'react';

import { UseVerificationEditorType } from '../../../hooks/verification/useVerificationEditor';
import { VerificationsList } from '../../verification/VerificationsList';

interface VerificationListProps {
  verification: UseVerificationEditorType;
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
    // References functionality
    referencesLoading,
    getModelReferences,
  } = verification;

  // Extract model from the selected host device
  const model = selectedHost?.device_model || '';

  // Memoize model references to prevent multiple calls during render
  const modelReferences = React.useMemo(
    () => getModelReferences(model),
    [getModelReferences, model],
  );

  return (
    <Box>
      {/* Collapsible toggle button and title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
        <IconButton
          size="small"
          onClick={() => setVerificationsCollapsed(!verificationsCollapsed)}
          sx={{ p: 0.25 }}
        >
          {verificationsCollapsed ? (
            <ArrowRightIcon sx={{ fontSize: '1rem' }} />
          ) : (
            <ArrowDownIcon sx={{ fontSize: '1rem' }} />
          )}
        </IconButton>
        <Typography variant="subtitle2" sx={{ fontSize: '0.8rem', fontWeight: 600 }}>
          Verifications
        </Typography>
      </Box>

      {/* Collapsible content */}
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
          <VerificationsList
            verifications={verifications}
            availableVerifications={availableVerificationTypes}
            onVerificationsChange={handleVerificationsChange}
            loading={loading}
            error={error}
            model={model}
            onTest={handleTest}
            testResults={testResults}
            reloadTrigger={referenceSaveCounter}
            onReferenceSelected={handleReferenceSelected}
            selectedHost={selectedHost}
            // Pass references functionality directly
            modelReferences={modelReferences}
            referencesLoading={referencesLoading}
          />
        </Box>
      </Collapse>
    </Box>
  );
};

export default VerificationList;
