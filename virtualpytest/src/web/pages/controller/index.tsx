import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Container,
  Button,
} from '@mui/material';

import { ControllerTypesOverview } from './components/ControllerTypesOverview';
import { ControllerImplementations } from './components/ControllerImplementations';
import { useControllerTypes } from './hooks/useControllerTypes';

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
      <Box>
        <Typography variant="h4" gutterBottom>
          Controller Configuration
        </Typography>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={refetch}>
          Retry
        </Button>
      </Box>
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