// This file is now deprecated and replaced by the modular controller structure
// Import the new refactored controller page
import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Container,
} from '@mui/material';

import { ControllerTypesOverview, ControllerImplementations } from '../src/components/remote';
import { useControllerTypes } from '../src/hooks/remote';

const ControllerPage: React.FC = () => {
  const { controllerTypes, loading, error, refetch } = useControllerTypes();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Controller Configuration
        </Typography>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <button onClick={refetch}>
          Retry
        </button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        VirtualPyTest Controller Management
      </Typography>

      <Grid container spacing={3}>
        {/* Controller Types Overview */}
        <Grid item xs={12}>
          <ControllerTypesOverview controllerTypes={controllerTypes} />
        </Grid>

        {/* Detailed Controller Implementations */}
        <Grid item xs={12}>
          <ControllerImplementations controllerTypes={controllerTypes} />
        </Grid>
      </Grid>
    </Container>
  );
};

export default ControllerPage;
