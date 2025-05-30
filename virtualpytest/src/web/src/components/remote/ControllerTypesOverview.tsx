import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Box,
  Chip,
} from '@mui/material';
import {
  Gamepad as ControllerIcon,
  Tv as TvIcon,
  Wifi as WifiIcon,
  Visibility as VerificationIcon,
  Power as PowerIcon,
  Memory as ProcessorIcon,
} from '@mui/icons-material';

import { ControllerTypes, ControllerType } from '../../types/remote/types';

interface ControllerTypesOverviewProps {
  controllerTypes: ControllerTypes | null;
}

export const ControllerTypesOverview: React.FC<ControllerTypesOverviewProps> = ({
  controllerTypes,
}) => {
  const getControllerIcon = (type: string) => {
    switch (type) {
      case 'remote': return <ControllerIcon />;
      case 'av': return <TvIcon />;
      case 'network': return <WifiIcon />;
      case 'verification': return <VerificationIcon />;
      case 'power': return <PowerIcon />;
      default: return <ProcessorIcon />;
    }
  };

  if (!controllerTypes) {
    return null;
  }

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Available Controller Types
          </Typography>
        </Box>

        <Grid container spacing={2}>
          {Object.entries(controllerTypes).map(([type, implementations]) => (
            <Grid item xs={12} sm={6} md={2.4} key={type}>
              <Paper sx={{ p: 2, textAlign: 'center', height: '100%' }}>
                <Box display="flex" justifyContent="center" mb={1}>
                  {getControllerIcon(type)}
                </Box>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Typography>
                <Typography variant="body2" color="textSecondary" mb={1}>
                  {implementations.length} types
                </Typography>
                <Box display="flex" justifyContent="center" gap={0.5} flexWrap="wrap">
                  {implementations.filter((impl: ControllerType) => impl.status === 'available').length > 0 && (
                    <Chip 
                      label={`${implementations.filter((impl: ControllerType) => impl.status === 'available').length} Ready`}
                      color="success" 
                      size="small" 
                    />
                  )}
                  {implementations.filter((impl: ControllerType) => impl.status === 'placeholder').length > 0 && (
                    <Chip 
                      label={`${implementations.filter((impl: ControllerType) => impl.status === 'placeholder').length} Planned`}
                      color="default" 
                      size="small" 
                    />
                  )}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}; 