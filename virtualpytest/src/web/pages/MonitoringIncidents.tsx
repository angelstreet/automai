import {
  CheckCircle as ResolvedIcon,
  Error as ActiveIcon,
  Visibility as MonitorIcon,
} from '@mui/icons-material';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert as MuiAlert,
  Grid,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { useAlerts, Alert } from '../hooks/pages/useAlerts';

const MonitoringIncidents: React.FC = () => {
  const { getAllAlerts } = useAlerts();
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [closedAlerts, setClosedAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load alerts data on component mount - optimized single query
  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Single API call to get all alerts
        const allAlerts = await getAllAlerts();

        // Client-side filtering
        const active = allAlerts.filter((alert) => alert.status === 'active');
        const closed = allAlerts.filter((alert) => alert.status === 'resolved');

        setActiveAlerts(active);
        setClosedAlerts(closed);

        console.log(
          `[@component:MonitoringIncidents] Loaded ${allAlerts.length} total alerts: ${active.length} active, ${closed.length} closed`,
        );
      } catch (err) {
        console.error('[@component:MonitoringIncidents] Error loading alerts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load alerts');
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, [getAllAlerts]);

  // Calculate stats
  const totalActiveAlerts = activeAlerts.length;
  const totalClosedAlerts = closedAlerts.length;

  // Calculate this week's alerts (last 7 days)
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const alertsThisWeek = [...activeAlerts, ...closedAlerts].filter(
    (alert) => new Date(alert.start_time) >= oneWeekAgo,
  ).length;

  // Get most common incident type
  const incidentTypeCounts = [...activeAlerts, ...closedAlerts].reduce(
    (acc, alert) => {
      acc[alert.incident_type] = (acc[alert.incident_type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const mostCommonIncidentType =
    Object.entries(incidentTypeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';

  // Format duration helper
  function formatDuration(startTime: string, endTime?: string): string {
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const durationMs = end.getTime() - start.getTime();

    if (durationMs < 60000) return `${Math.floor(durationMs / 1000)}s`;
    if (durationMs < 3600000) return `${Math.floor(durationMs / 60000)}m`;
    const hours = Math.floor(durationMs / 3600000);
    const minutes = Math.floor((durationMs % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }

  // Format date helper
  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  // Get incident type chip color
  function getIncidentTypeColor(incidentType: string): 'error' | 'warning' | 'info' {
    switch (incidentType.toLowerCase()) {
      case 'blackscreen':
      case 'freeze':
        return 'error';
      case 'audio_loss':
        return 'warning';
      default:
        return 'info';
    }
  }

  // Loading state component
  const LoadingState = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <CircularProgress />
    </Box>
  );

  // Empty state component
  const EmptyState = ({ message }: { message: string }) => (
    <TableRow>
      <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="textSecondary">
          {message}
        </Typography>
      </TableCell>
    </TableRow>
  );

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h4" gutterBottom>
          Alerts
        </Typography>
      </Box>

      {error && (
        <MuiAlert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
          {error}
        </MuiAlert>
      )}

      {/* Quick Stats */}
      <Box sx={{ mb: 0.5 }}>
        <Card>
          <CardContent sx={{ py: 0.5 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Box display="flex" alignItems="center" gap={1}>
                <MonitorIcon color="primary" />
                <Typography variant="h6">Incident Summary</Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={4}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Active Alerts</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {totalActiveAlerts}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">This Week</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {alertsThisWeek}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Common Type</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {mostCommonIncidentType}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="body2">Total Closed</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {totalClosedAlerts}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Grid container spacing={2}>
        {/* Alerts In Progress */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Alerts In Progress
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small" sx={{ '& .MuiTableRow-root': { height: '40px' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Incident Type</strong>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Host</strong>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Device</strong>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Start Time</strong>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Duration</strong>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Consecutive Count</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <LoadingState />
                        </TableCell>
                      </TableRow>
                    ) : activeAlerts.length === 0 ? (
                      <EmptyState message="No active alerts" />
                    ) : (
                      activeAlerts.map((alert) => (
                        <TableRow
                          key={alert.id}
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                            },
                          }}
                        >
                          <TableCell sx={{ py: 0.5 }}>
                            <Chip
                              icon={<ActiveIcon />}
                              label={alert.incident_type}
                              color={getIncidentTypeColor(alert.incident_type)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell sx={{ py: 0.5 }}>{alert.host_name}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>{alert.device_id}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>{formatDate(alert.start_time)}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>{formatDuration(alert.start_time)}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>
                            <Chip label={alert.consecutive_count} size="small" variant="outlined" />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Alerts Closed */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Alerts Closed
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small" sx={{ '& .MuiTableRow-root': { height: '40px' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Incident Type</strong>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Host</strong>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Device</strong>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Start Time</strong>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <strong>End Time</strong>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Total Duration</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <LoadingState />
                        </TableCell>
                      </TableRow>
                    ) : closedAlerts.length === 0 ? (
                      <EmptyState message="No closed alerts" />
                    ) : (
                      closedAlerts.map((alert) => (
                        <TableRow
                          key={alert.id}
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04) !important',
                            },
                          }}
                        >
                          <TableCell sx={{ py: 0.5 }}>
                            <Chip
                              icon={<ResolvedIcon />}
                              label={alert.incident_type}
                              color="success"
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell sx={{ py: 0.5 }}>{alert.host_name}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>{alert.device_id}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>{formatDate(alert.start_time)}</TableCell>
                          <TableCell sx={{ py: 0.5 }}>
                            {alert.end_time ? formatDate(alert.end_time) : 'N/A'}
                          </TableCell>
                          <TableCell sx={{ py: 0.5 }}>
                            {alert.end_time
                              ? formatDuration(alert.start_time, alert.end_time)
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default MonitoringIncidents;
