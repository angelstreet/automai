import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Alert,
} from '@mui/material';
import {
  Storage as CollectionIcon,
  Add as AddIcon,
  List as ListIcon,
  VideoLibrary as VodIcon,
  Tv as ChannelIcon,
} from '@mui/icons-material';

const Collections: React.FC = () => {
  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Collections
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Manage test data collections including channel lists, VOD catalogs, and other data sets required for testing.
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Collections feature is coming soon. This will allow you to manage channel lists, VOD catalogs, and other test data collections.
      </Alert>

      <Grid container spacing={3}>
        {/* Channel Lists */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <ChannelIcon color="primary" />
                  <Typography variant="h6">Channel Lists</Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  disabled
                >
                  Add
                </Button>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Manage channel lineups and configurations for testing different channel scenarios.
              </Typography>
              <Box mt={2}>
                <Typography variant="caption" color="textSecondary">
                  0 channel lists configured
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* VOD Catalogs */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <VodIcon color="secondary" />
                  <Typography variant="h6">VOD Catalogs</Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  disabled
                >
                  Add
                </Button>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Configure video-on-demand content catalogs for testing streaming scenarios.
              </Typography>
              <Box mt={2}>
                <Typography variant="caption" color="textSecondary">
                  0 VOD catalogs configured
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Test Data Sets */}
        <Grid item xs={12} md={6} lg={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <ListIcon color="info" />
                  <Typography variant="h6">Test Data Sets</Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  disabled
                >
                  Add
                </Button>
              </Box>
              <Typography variant="body2" color="textSecondary">
                Manage custom test data sets and configurations for various testing scenarios.
              </Typography>
              <Box mt={2}>
                <Typography variant="caption" color="textSecondary">
                  0 data sets configured
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled
          >
            Import Channel List
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            color="secondary"
            disabled
          >
            Create VOD Catalog
          </Button>
          <Button
            variant="outlined"
            startIcon={<CollectionIcon />}
            disabled
          >
            Manage Collections
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Collections; 