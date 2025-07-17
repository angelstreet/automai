import {
  CheckCircle as PassIcon,
  Clear as ClearIcon,
  Error as FailIcon,
  Link as LinkIcon,
  PlayArrow as ActionIcon,
  Search as SearchIcon,
  Verified as VerificationIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState, useEffect } from 'react';

import { useExecutionResults } from '../hooks/pages/useExecutionResults';
import { useScriptResults } from '../hooks/pages/useScriptResults';

interface ScriptDependency {
  script_result_id: string;
  script_name: string;
  script_type: string;
  userinterface_name: string | null;
  host_name: string;
  device_name: string;
  success: boolean;
  execution_time_ms: number | null;
  started_at: string;
  html_report_r2_url: string | null;
  edges_executed: number;
  nodes_verified: number;
  successful_operations: number;
  failed_operations: number;
}

interface ElementDependency {
  element_id: string;
  element_name: string;
  element_type: 'edge' | 'node';
  tree_name: string;
  script_executions: Array<{
    script_result_id: string;
    script_name: string;
    script_type: string;
    success: boolean;
    execution_time_ms: number;
    started_at: string;
    html_report_r2_url: string | null;
    script_context: string;
  }>;
  total_executions: number;
  success_rate: number;
}

const DependencyReport: React.FC = () => {
  const { getAllScriptResults } = useScriptResults();
  const { getAllExecutionResults } = useExecutionResults();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [scriptDependencies, setScriptDependencies] = useState<ScriptDependency[]>([]);
  const [nodeDependencies, setNodeDependencies] = useState<ElementDependency[]>([]);
  const [edgeDependencies, setEdgeDependencies] = useState<ElementDependency[]>([]);

  // Filter states
  const [scriptFilter, setScriptFilter] = useState('');
  const [nodeFilter, setNodeFilter] = useState('');
  const [edgeFilter, setEdgeFilter] = useState('');

  // Load data on component mount
  useEffect(() => {
    const loadDependencyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load script results and execution results
        const [scriptResults, executionResults] = await Promise.all([
          getAllScriptResults(),
          getAllExecutionResults(),
        ]);

        // Process script dependencies
        const scriptDeps = await Promise.all(
          scriptResults.map(async (script) => {
            const scriptExecutions = executionResults.filter(
              (exec) => exec.script_result_id === script.id,
            );

            const edgesExecuted = scriptExecutions.filter(
              (exec) => exec.execution_type === 'action',
            ).length;

            const nodesVerified = scriptExecutions.filter(
              (exec) => exec.execution_type === 'verification',
            ).length;

            const successfulOps = scriptExecutions.filter((exec) => exec.success).length;

            const failedOps = scriptExecutions.filter((exec) => !exec.success).length;

            return {
              script_result_id: script.id,
              script_name: script.script_name,
              script_type: script.script_type,
              userinterface_name: script.userinterface_name,
              host_name: script.host_name,
              device_name: script.device_name,
              success: script.success,
              execution_time_ms: script.execution_time_ms,
              started_at: script.started_at,
              html_report_r2_url: script.html_report_r2_url,
              edges_executed: edgesExecuted,
              nodes_verified: nodesVerified,
              successful_operations: successfulOps,
              failed_operations: failedOps,
            };
          }),
        );

        // Process node dependencies
        const nodeGroups = executionResults
          .filter((exec) => exec.execution_type === 'verification' && exec.node_id)
          .reduce(
            (acc, exec) => {
              const key = exec.node_id!;
              if (!acc[key]) {
                acc[key] = {
                  element_id: key,
                  element_name: exec.element_name,
                  element_type: 'node' as const,
                  tree_name: exec.tree_name,
                  script_executions: [],
                  total_executions: 0,
                  success_rate: 0,
                };
              }

              if (exec.script_result_id) {
                const scriptInfo = scriptResults.find((s) => s.id === exec.script_result_id);
                if (scriptInfo) {
                  acc[key].script_executions.push({
                    script_result_id: exec.script_result_id,
                    script_name: scriptInfo.script_name,
                    script_type: scriptInfo.script_type,
                    success: exec.success,
                    execution_time_ms: exec.execution_time_ms,
                    started_at: exec.executed_at,
                    html_report_r2_url: scriptInfo.html_report_r2_url,
                    script_context: exec.script_context || 'script',
                  });
                }
              }

              acc[key].total_executions++;
              return acc;
            },
            {} as Record<string, ElementDependency>,
          );

        // Calculate success rates for nodes
        Object.values(nodeGroups).forEach((node) => {
          const successCount = node.script_executions.filter((s) => s.success).length;
          node.success_rate =
            node.total_executions > 0 ? (successCount / node.total_executions) * 100 : 0;
        });

        // Process edge dependencies
        const edgeGroups = executionResults
          .filter((exec) => exec.execution_type === 'action' && exec.edge_id)
          .reduce(
            (acc, exec) => {
              const key = exec.edge_id!;
              if (!acc[key]) {
                acc[key] = {
                  element_id: key,
                  element_name: exec.element_name,
                  element_type: 'edge' as const,
                  tree_name: exec.tree_name,
                  script_executions: [],
                  total_executions: 0,
                  success_rate: 0,
                };
              }

              if (exec.script_result_id) {
                const scriptInfo = scriptResults.find((s) => s.id === exec.script_result_id);
                if (scriptInfo) {
                  acc[key].script_executions.push({
                    script_result_id: exec.script_result_id,
                    script_name: scriptInfo.script_name,
                    script_type: scriptInfo.script_type,
                    success: exec.success,
                    execution_time_ms: exec.execution_time_ms,
                    started_at: exec.executed_at,
                    html_report_r2_url: scriptInfo.html_report_r2_url,
                    script_context: exec.script_context || 'script',
                  });
                }
              }

              acc[key].total_executions++;
              return acc;
            },
            {} as Record<string, ElementDependency>,
          );

        // Calculate success rates for edges
        Object.values(edgeGroups).forEach((edge) => {
          const successCount = edge.script_executions.filter((s) => s.success).length;
          edge.success_rate =
            edge.total_executions > 0 ? (successCount / edge.total_executions) * 100 : 0;
        });

        setScriptDependencies(scriptDeps);
        setNodeDependencies(Object.values(nodeGroups));
        setEdgeDependencies(Object.values(edgeGroups));
      } catch (err) {
        console.error('[@component:DependencyReport] Error loading dependency data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dependency data');
      } finally {
        setLoading(false);
      }
    };

    loadDependencyData();
  }, [getAllScriptResults, getAllExecutionResults]);

  // Filter functions
  const filteredScriptDependencies = scriptDependencies.filter(
    (script) =>
      script.script_name.toLowerCase().includes(scriptFilter.toLowerCase()) ||
      script.script_type.toLowerCase().includes(scriptFilter.toLowerCase()) ||
      (script.userinterface_name &&
        script.userinterface_name.toLowerCase().includes(scriptFilter.toLowerCase())),
  );

  const filteredNodeDependencies = nodeDependencies.filter(
    (node) =>
      node.element_name.toLowerCase().includes(nodeFilter.toLowerCase()) ||
      node.tree_name.toLowerCase().includes(nodeFilter.toLowerCase()),
  );

  const filteredEdgeDependencies = edgeDependencies.filter(
    (edge) =>
      edge.element_name.toLowerCase().includes(edgeFilter.toLowerCase()) ||
      edge.tree_name.toLowerCase().includes(edgeFilter.toLowerCase()),
  );

  // Format helpers
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(1);
    return `${minutes}m ${seconds}s`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  // Loading state component
  const LoadingState = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
      <CircularProgress />
    </Box>
  );

  // Empty state component
  const EmptyState = ({ message }: { message: string }) => (
    <TableRow>
      <TableCell colSpan={10} sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="textSecondary">
          {message}
        </Typography>
      </TableCell>
    </TableRow>
  );

  // Search field component
  const SearchField = ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
  }) => (
    <TextField
      size="small"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        endAdornment: value && (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => onChange('')}>
              <ClearIcon />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{ minWidth: 250 }}
    />
  );

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dependency Report
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Track script dependencies with navigation elements and vice versa
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Script Dependencies" />
            <Tab label="Node Dependencies" />
            <Tab label="Edge Dependencies" />
          </Tabs>

          {/* Tab 1: Script Dependencies */}
          {activeTab === 0 && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6">
                  Script Dependencies ({filteredScriptDependencies.length})
                </Typography>
                <SearchField
                  value={scriptFilter}
                  onChange={setScriptFilter}
                  placeholder="Search scripts..."
                />
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Script Name</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Type</strong>
                      </TableCell>
                      <TableCell>
                        <strong>UI Name</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Status</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Edges</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Nodes</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Success/Fail</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Duration</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Started</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Report</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={10}>
                          <LoadingState />
                        </TableCell>
                      </TableRow>
                    ) : filteredScriptDependencies.length === 0 ? (
                      <EmptyState message="No script dependencies found" />
                    ) : (
                      filteredScriptDependencies.map((script) => (
                        <TableRow key={script.script_result_id}>
                          <TableCell>{script.script_name}</TableCell>
                          <TableCell>{script.script_type}</TableCell>
                          <TableCell>{script.userinterface_name || 'N/A'}</TableCell>
                          <TableCell>
                            <Chip
                              icon={script.success ? <PassIcon /> : <FailIcon />}
                              label={script.success ? 'PASS' : 'FAIL'}
                              color={script.success ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{script.edges_executed}</TableCell>
                          <TableCell>{script.nodes_verified}</TableCell>
                          <TableCell>
                            {script.successful_operations}/{script.failed_operations}
                          </TableCell>
                          <TableCell>
                            {script.execution_time_ms
                              ? formatDuration(script.execution_time_ms)
                              : 'N/A'}
                          </TableCell>
                          <TableCell>{formatDate(script.started_at)}</TableCell>
                          <TableCell>
                            {script.html_report_r2_url ? (
                              <Chip
                                icon={<LinkIcon />}
                                label="View"
                                size="small"
                                clickable
                                onClick={() => window.open(script.html_report_r2_url!, '_blank')}
                                color="primary"
                                variant="outlined"
                              />
                            ) : (
                              <Chip label="No Report" size="small" variant="outlined" disabled />
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tab 2: Node Dependencies */}
          {activeTab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6">
                  Node Dependencies ({filteredNodeDependencies.length})
                </Typography>
                <SearchField
                  value={nodeFilter}
                  onChange={setNodeFilter}
                  placeholder="Search nodes..."
                />
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Node Name</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Tree</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Script Executions</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Success Rate</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Recent Scripts</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <LoadingState />
                        </TableCell>
                      </TableRow>
                    ) : filteredNodeDependencies.length === 0 ? (
                      <EmptyState message="No node dependencies found" />
                    ) : (
                      filteredNodeDependencies.map((node) => (
                        <TableRow key={node.element_id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <VerificationIcon fontSize="small" color="secondary" />
                              {node.element_name}
                            </Box>
                          </TableCell>
                          <TableCell>{node.tree_name}</TableCell>
                          <TableCell>{node.total_executions}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${node.success_rate.toFixed(1)}%`}
                              color={
                                node.success_rate >= 80
                                  ? 'success'
                                  : node.success_rate >= 60
                                    ? 'warning'
                                    : 'error'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {node.script_executions.slice(0, 3).map((script, index) => (
                                <Chip
                                  key={index}
                                  label={script.script_name}
                                  size="small"
                                  variant="outlined"
                                  color={script.success ? 'success' : 'error'}
                                  onClick={() =>
                                    script.html_report_r2_url &&
                                    window.open(script.html_report_r2_url, '_blank')
                                  }
                                  clickable={!!script.html_report_r2_url}
                                />
                              ))}
                              {node.script_executions.length > 3 && (
                                <Chip
                                  label={`+${node.script_executions.length - 3} more`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tab 3: Edge Dependencies */}
          {activeTab === 2 && (
            <Box sx={{ mt: 2 }}>
              <Box
                sx={{
                  mb: 2,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Typography variant="h6">
                  Edge Dependencies ({filteredEdgeDependencies.length})
                </Typography>
                <SearchField
                  value={edgeFilter}
                  onChange={setEdgeFilter}
                  placeholder="Search edges..."
                />
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Edge Name</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Tree</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Script Executions</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Success Rate</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Recent Scripts</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <LoadingState />
                        </TableCell>
                      </TableRow>
                    ) : filteredEdgeDependencies.length === 0 ? (
                      <EmptyState message="No edge dependencies found" />
                    ) : (
                      filteredEdgeDependencies.map((edge) => (
                        <TableRow key={edge.element_id}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <ActionIcon fontSize="small" color="primary" />
                              {edge.element_name}
                            </Box>
                          </TableCell>
                          <TableCell>{edge.tree_name}</TableCell>
                          <TableCell>{edge.total_executions}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${edge.success_rate.toFixed(1)}%`}
                              color={
                                edge.success_rate >= 80
                                  ? 'success'
                                  : edge.success_rate >= 60
                                    ? 'warning'
                                    : 'error'
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {edge.script_executions.slice(0, 3).map((script, index) => (
                                <Chip
                                  key={index}
                                  label={script.script_name}
                                  size="small"
                                  variant="outlined"
                                  color={script.success ? 'success' : 'error'}
                                  onClick={() =>
                                    script.html_report_r2_url &&
                                    window.open(script.html_report_r2_url, '_blank')
                                  }
                                  clickable={!!script.html_report_r2_url}
                                />
                              ))}
                              {edge.script_executions.length > 3 && (
                                <Chip
                                  label={`+${edge.script_executions.length - 3} more`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default DependencyReport;
