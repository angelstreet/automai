import {
  CheckCircle as ResolvedIcon,
  Error as ActiveIcon,
  Visibility as MonitorIcon,
  KeyboardArrowDown as ExpandMoreIcon,
  KeyboardArrowRight as ExpandLessIcon,
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
  IconButton,
  Collapse,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { useAlerts, Alert } from '../hooks/pages/useAlerts';

const MonitoringIncidents: React.FC = () => {
  const { getAllAlerts } = useAlerts();
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [closedAlerts, setClosedAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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

  // Format duration between two dates
  const formatDuration = (startTime: string, endTime?: string): string => {
    try {
      // Parse dates with better error handling
      const start = new Date(startTime);
      const end = endTime ? new Date(endTime) : new Date();

      // Validate dates
      if (isNaN(start.getTime())) {
        console.warn(`[@component:MonitoringIncidents] Invalid start time: ${startTime}`);
        return 'Invalid Date';
      }

      if (endTime && isNaN(end.getTime())) {
        console.warn(`[@component:MonitoringIncidents] Invalid end time: ${endTime}`);
        return 'Invalid Date';
      }

      // Check for unreasonable future dates (likely parsing error)
      const currentYear = new Date().getFullYear();
      if (start.getFullYear() > currentYear + 1) {
        console.warn(
          `[@component:MonitoringIncidents] Start time appears to be in the future (${start.getFullYear()}): ${startTime}`,
        );
        return 'Future Date';
      }

      const durationMs = end.getTime() - start.getTime();

      if (durationMs < 0) {
        console.warn(`[@component:MonitoringIncidents] Negative duration detected:`);
        console.warn(`  - startTime: ${startTime} -> ${start.toISOString()} (${start.getTime()})`);
        console.warn(`  - endTime: ${endTime || 'now'} -> ${end.toISOString()} (${end.getTime()})`);
        console.warn(`  - duration: ${durationMs}ms`);
        console.warn(`  - Current local time: ${new Date().toLocaleString()}`);
        console.warn(`  - Current UTC time: ${new Date().toISOString()}`);

        // For negative durations, try to show absolute value with warning
        const absDuration = Math.abs(durationMs);
        const seconds = Math.floor(absDuration / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
          return `~${hours}h ${minutes % 60}m (time sync issue)`;
        } else if (minutes > 0) {
          return `~${minutes}m ${seconds % 60}s (time sync issue)`;
        } else {
          return `~${seconds}s (time sync issue)`;
        }
      }

      const seconds = Math.floor(durationMs / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 0) {
        return `${days}d ${hours % 24}h`;
      } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      } else {
        return `${seconds}s`;
      }
    } catch (error) {
      console.error(`[@component:MonitoringIncidents] Error formatting duration:`, error);
      return 'Error';
    }
  };

  // Format date helper with better error handling
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }

      // Check for unreasonable future dates
      const currentYear = new Date().getFullYear();
      if (date.getFullYear() > currentYear + 1) {
        return `${date.toLocaleDateString()} (Future?)`;
      }

      return date.toLocaleDateString() + ', ' + date.toLocaleTimeString();
    } catch (error) {
      console.error(`[@component:MonitoringIncidents] Error formatting date: ${dateString}`, error);
      return 'Error';
    }
  };

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

  // Toggle expanded row
  const toggleRowExpansion = (alertId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  // Get image URLs from alert metadata
  const getAlertImageUrls = (alert: Alert) => {
    const r2Images = alert.metadata?.r2_images;
    if (r2Images) {
      return {
        originalUrl: r2Images.original_url,
        thumbnailUrl: r2Images.thumbnail_url,
        hasR2Images: true,
      };
    }
    return {
      originalUrl: null,
      thumbnailUrl: null,
      hasR2Images: false,
    };
  };

  // Render expandable row content - minimalist design
  const renderExpandedContent = (alert: Alert) => {
    const imageUrls = getAlertImageUrls(alert);

    if (!imageUrls.hasR2Images) {
      return (
        <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">No images available for this alert</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2 }}>
        <Grid container spacing={3} alignItems="center">
          {/* Start Time Image */}
          <Grid item>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="caption" display="block" sx={{ mb: 1, color: 'text.secondary' }}>
                Start Time
              </Typography>
              <Box
                component="img"
                src={imageUrls.thumbnailUrl}
                alt="Alert start"
                sx={{
                  width: 120,
                  height: 'auto',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
                onClick={() => {
                  // TODO: Open modal with full size image
                  window.open(imageUrls.originalUrl || imageUrls.thumbnailUrl, '_blank');
                }}
              />
            </Box>
          </Grid>

          {/* End Time Image (if resolved) */}
          {alert.status === 'resolved' && (
            <Grid item>
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ mb: 1, color: 'text.secondary' }}
                >
                  End Time
                </Typography>
                <Box
                  component="img"
                  src={imageUrls.thumbnailUrl}
                  alt="Alert end"
                  sx={{
                    width: 120,
                    height: 'auto',
                    borderRadius: 1,
                    border: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    '&:hover': {
                      opacity: 0.8,
                    },
                  }}
                  onClick={() => {
                    // TODO: Open modal with full size image
                    window.open(imageUrls.originalUrl || imageUrls.thumbnailUrl, '_blank');
                  }}
                />
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>
    );
  };

  // Loading state component
  const LoadingState = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <CircularProgress />
    </Box>
  );

  // Empty state component
  const EmptyState = ({ message, colSpan }: { message: string; colSpan: number }) => (
    <TableRow>
      <TableCell colSpan={colSpan} sx={{ textAlign: 'center', py: 4 }}>
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
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1, width: 50 }}>
                        <strong>Expand</strong>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Incident</strong>
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
                      <EmptyState message="No active alerts" colSpan={6} />
                    ) : (
                      activeAlerts.map((alert) => (
                        <React.Fragment key={alert.id}>
                          <TableRow
                            sx={{
                              '&:hover': {
                                backgroundColor: 'transparent !important',
                              },
                              height: '48px', // Fixed height for main rows
                            }}
                          >
                            <TableCell sx={{ py: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => toggleRowExpansion(alert.id)}
                                sx={{ p: 0.5 }}
                              >
                                {expandedRows.has(alert.id) ? (
                                  <ExpandMoreIcon />
                                ) : (
                                  <ExpandLessIcon />
                                )}
                              </IconButton>
                            </TableCell>
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
                            <TableCell sx={{ py: 0.5 }}>
                              {formatDuration(alert.start_time)}
                            </TableCell>
                          </TableRow>
                          {expandedRows.has(alert.id) && (
                            <TableRow
                              sx={{
                                '&:hover': {
                                  backgroundColor: 'transparent !important',
                                },
                              }}
                            >
                              <TableCell colSpan={6} sx={{ p: 0, borderBottom: 0 }}>
                                <Collapse
                                  in={expandedRows.has(alert.id)}
                                  timeout="auto"
                                  unmountOnExit
                                >
                                  <Box sx={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                                    {renderExpandedContent(alert)}
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
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
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ py: 1, width: 50 }}>
                        <strong>Expand</strong>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <strong>Incident</strong>
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
                        <TableCell colSpan={7}>
                          <LoadingState />
                        </TableCell>
                      </TableRow>
                    ) : closedAlerts.length === 0 ? (
                      <EmptyState message="No closed alerts" colSpan={7} />
                    ) : (
                      closedAlerts.map((alert) => (
                        <React.Fragment key={alert.id}>
                          <TableRow
                            sx={{
                              '&:hover': {
                                backgroundColor: 'transparent !important',
                              },
                              height: '48px', // Fixed height for main rows
                            }}
                          >
                            <TableCell sx={{ py: 0.5 }}>
                              <IconButton
                                size="small"
                                onClick={() => toggleRowExpansion(alert.id)}
                                sx={{ p: 0.5 }}
                              >
                                {expandedRows.has(alert.id) ? (
                                  <ExpandMoreIcon />
                                ) : (
                                  <ExpandLessIcon />
                                )}
                              </IconButton>
                            </TableCell>
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
                          {expandedRows.has(alert.id) && (
                            <TableRow
                              sx={{
                                '&:hover': {
                                  backgroundColor: 'transparent !important',
                                },
                              }}
                            >
                              <TableCell colSpan={7} sx={{ p: 0, borderBottom: 0 }}>
                                <Collapse
                                  in={expandedRows.has(alert.id)}
                                  timeout="auto"
                                  unmountOnExit
                                >
                                  <Box sx={{ backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                                    {renderExpandedContent(alert)}
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
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
