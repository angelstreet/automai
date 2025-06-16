import { Box, Typography, Grid, Alert, CircularProgress, Container } from '@mui/material';
import React from 'react';

import { ControllerTypesOverview, ControllerImplementations } from '../components/controller';
import { useControllers } from '../hooks/controller';

const ControllerPage: React.FC = () => {
  const { controllerTypes, loading, error, refetch } = useControllers();

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
        <button onClick={refetch}>Retry</button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Controller Management
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
