import {
  Clear as ClearIcon,
  ExpandLess,
  ExpandMore,
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
  Collapse,
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
import { useUserInterface } from '../hooks/pages/useUserInterface';

interface ScriptNodeDependency {
  script_result_id: string;
  script_name: string;
  userinterface_name: string | null;
  nodes: Array<{
    node_id: string;
    node_name: string;
    execution_count: number;
    success_rate: number;
  }>;
}

interface ScriptEdgeDependency {
  script_result_id: string;
  script_name: string;
  userinterface_name: string | null;
  edges: Array<{
    edge_id: string;
    edge_name: string;
    execution_count: number;
    success_rate: number;
  }>;
}

interface NodeScriptDependency {
  node_id: string;
  node_name: string;
  tree_name: string;
  scripts: Array<{
    script_result_id: string;
    script_name: string;
    execution_count: number;
    success_rate: number;
    html_report_r2_url: string | null;
  }>;
  total_executions: number;
  overall_success_rate: number;
}

interface EdgeScriptDependency {
  edge_id: string;
  edge_name: string;
  tree_name: string;
  scripts: Array<{
    script_result_id: string;
    script_name: string;
    execution_count: number;
    success_rate: number;
    html_report_r2_url: string | null;
  }>;
  total_executions: number;
  overall_success_rate: number;
}

const DependencyReport: React.FC = () => {
  const { getAllScriptResults } = useScriptResults();
  const { getAllExecutionResults } = useExecutionResults();
  const { getAllUserInterfaces } = useUserInterface();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Data states
  const [scriptNodeDependencies, setScriptNodeDependencies] = useState<ScriptNodeDependency[]>([]);
  const [scriptEdgeDependencies, setScriptEdgeDependencies] = useState<ScriptEdgeDependency[]>([]);
  const [nodeScriptDependencies, setNodeScriptDependencies] = useState<NodeScriptDependency[]>([]);
  const [edgeScriptDependencies, setEdgeScriptDependencies] = useState<EdgeScriptDependency[]>([]);
  const [_treeToInterfaceMap, setTreeToInterfaceMap] = useState<Record<string, string>>({});

  // Filter states
  const [scriptNodeFilter, setScriptNodeFilter] = useState('');
  const [scriptEdgeFilter, setScriptEdgeFilter] = useState('');
  const [nodeScriptFilter, setNodeScriptFilter] = useState('');
  const [edgeScriptFilter, setEdgeScriptFilter] = useState('');

  // Toggle row expansion
  const toggleRowExpansion = (rowId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  // Load data on component mount
  useEffect(() => {
    const loadDependencyData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load script results, execution results, and user interfaces
        const [scriptResults, executionResults, userInterfaces] = await Promise.all([
          getAllScriptResults(),
          getAllExecutionResults(),
          getAllUserInterfaces(),
        ]);

        // Create mapping from tree_id to userinterface_name
        const treeMap: Record<string, string> = {};
        userInterfaces.forEach((ui) => {
          if (ui.root_tree?.id) {
            treeMap[ui.root_tree.id] = ui.name;
          }
        });
        setTreeToInterfaceMap(treeMap);

        // Process Script → Node Dependencies
        const scriptNodeDeps: ScriptNodeDependency[] = [];
        const scriptNodeMap = new Map<
          string,
          {
            script_name: string;
            userinterface_name: string | null;
            script_result_ids: string[];
            nodeExecutions: any[];
          }
        >();

        // Group by script name
        scriptResults.forEach((script) => {
          const nodeExecutions = executionResults.filter(
            (exec) =>
              exec.script_result_id === script.id &&
              exec.execution_type === 'verification' &&
              exec.node_id,
          );

          if (nodeExecutions.length > 0) {
            if (!scriptNodeMap.has(script.script_name)) {
              scriptNodeMap.set(script.script_name, {
                script_name: script.script_name,
                userinterface_name: script.userinterface_name,
                script_result_ids: [script.id],
                nodeExecutions: [],
              });
            }

            const existing = scriptNodeMap.get(script.script_name)!;
            existing.script_result_ids.push(script.id);
            existing.nodeExecutions.push(...nodeExecutions);
          }
        });

        // Process grouped scripts
        for (const [_scriptName, data] of scriptNodeMap.entries()) {
          const nodeMap = new Map<string, Array<{ success: boolean }>>();
          data.nodeExecutions.forEach((exec) => {
            if (!nodeMap.has(exec.node_id!)) {
              nodeMap.set(exec.node_id!, []);
            }
            nodeMap.get(exec.node_id!)!.push({ success: exec.success });
          });

          const nodes = Array.from(nodeMap.entries()).map(([nodeId, executions]) => {
            const successCount = executions.filter((e) => e.success).length;
            const nodeName =
              data.nodeExecutions.find((e) => e.node_id === nodeId)?.element_name ||
              `Node ${nodeId.slice(0, 8)}`;

            return {
              node_id: nodeId,
              node_name: nodeName,
              execution_count: executions.length,
              success_rate: (successCount / executions.length) * 100,
            };
          });

          if (nodes.length > 0) {
            scriptNodeDeps.push({
              script_result_id: data.script_result_ids[0], // Use first ID for key
              script_name: data.script_name,
              userinterface_name: data.userinterface_name,
              nodes,
            });
          }
        }

        // Process Script → Edge Dependencies
        const scriptEdgeDeps: ScriptEdgeDependency[] = [];
        const scriptEdgeMap = new Map<
          string,
          {
            script_name: string;
            userinterface_name: string | null;
            script_result_ids: string[];
            edgeExecutions: any[];
          }
        >();

        // Group by script name
        scriptResults.forEach((script) => {
          const edgeExecutions = executionResults.filter(
            (exec) =>
              exec.script_result_id === script.id &&
              exec.execution_type === 'action' &&
              exec.edge_id,
          );

          if (edgeExecutions.length > 0) {
            if (!scriptEdgeMap.has(script.script_name)) {
              scriptEdgeMap.set(script.script_name, {
                script_name: script.script_name,
                userinterface_name: script.userinterface_name,
                script_result_ids: [script.id],
                edgeExecutions: [],
              });
            }

            const existing = scriptEdgeMap.get(script.script_name)!;
            existing.script_result_ids.push(script.id);
            existing.edgeExecutions.push(...edgeExecutions);
          }
        });

        // Process grouped scripts
        for (const [_scriptName, data] of scriptEdgeMap.entries()) {
          const edgeMap = new Map<string, Array<{ success: boolean }>>();
          data.edgeExecutions.forEach((exec) => {
            if (!edgeMap.has(exec.edge_id!)) {
              edgeMap.set(exec.edge_id!, []);
            }
            edgeMap.get(exec.edge_id!)!.push({ success: exec.success });
          });

          const edges = Array.from(edgeMap.entries()).map(([edgeId, executions]) => {
            const successCount = executions.filter((e) => e.success).length;
            const edgeName =
              data.edgeExecutions.find((e) => e.edge_id === edgeId)?.element_name ||
              `Edge ${edgeId.slice(0, 8)}`;

            return {
              edge_id: edgeId,
              edge_name: edgeName,
              execution_count: executions.length,
              success_rate: (successCount / executions.length) * 100,
            };
          });

          if (edges.length > 0) {
            scriptEdgeDeps.push({
              script_result_id: data.script_result_ids[0], // Use first ID for key
              script_name: data.script_name,
              userinterface_name: data.userinterface_name,
              edges,
            });
          }
        }

        // Process Node → Scripts Dependencies
        const nodeMap = new Map<
          string,
          {
            node_name: string;
            tree_name: string;
            script_executions: Array<{
              script_result_id: string;
              script_name: string;
              success: boolean;
              html_report_r2_url: string | null;
            }>;
          }
        >();

        executionResults
          .filter((exec) => exec.execution_type === 'verification' && exec.node_id)
          .forEach((exec) => {
            if (!nodeMap.has(exec.node_id!)) {
              nodeMap.set(exec.node_id!, {
                node_name: exec.element_name || `Node ${exec.node_id!.slice(0, 8)}`,
                tree_name: treeMap[exec.tree_id] || exec.tree_name,
                script_executions: [],
              });
            }

            const scriptInfo = scriptResults.find((s) => s.id === exec.script_result_id);
            if (scriptInfo) {
              nodeMap.get(exec.node_id!)!.script_executions.push({
                script_result_id: exec.script_result_id!,
                script_name: scriptInfo.script_name,
                success: exec.success,
                html_report_r2_url: scriptInfo.html_report_r2_url,
              });
            }
          });

        const nodeScriptDeps: NodeScriptDependency[] = Array.from(nodeMap.entries()).map(
          ([nodeId, data]) => {
            // Group executions by script name
            const scriptGroups = new Map<
              string,
              Array<{
                success: boolean;
                html_report_r2_url: string | null;
                script_result_id: string;
              }>
            >();
            data.script_executions.forEach((exec) => {
              if (!scriptGroups.has(exec.script_name)) {
                scriptGroups.set(exec.script_name, []);
              }
              scriptGroups.get(exec.script_name)!.push({
                success: exec.success,
                html_report_r2_url: exec.html_report_r2_url,
                script_result_id: exec.script_result_id,
              });
            });

            const scripts = Array.from(scriptGroups.entries()).map(([scriptName, executions]) => {
              const successCount = executions.filter((e) => e.success).length;
              const htmlReport = executions[0]?.html_report_r2_url || null;

              return {
                script_result_id: executions[0].script_result_id, // Use first script_result_id for key
                script_name: scriptName,
                execution_count: executions.length,
                success_rate: (successCount / executions.length) * 100,
                html_report_r2_url: htmlReport,
              };
            });

            const totalExecutions = data.script_executions.length;
            const totalSuccesses = data.script_executions.filter((e) => e.success).length;

            return {
              node_id: nodeId,
              node_name: data.node_name,
              tree_name: data.tree_name,
              scripts,
              total_executions: totalExecutions,
              overall_success_rate:
                totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0,
            };
          },
        );

        // Process Edge → Scripts Dependencies
        const edgeMap = new Map<
          string,
          {
            edge_name: string;
            tree_name: string;
            script_executions: Array<{
              script_result_id: string;
              script_name: string;
              success: boolean;
              html_report_r2_url: string | null;
            }>;
          }
        >();

        executionResults
          .filter((exec) => exec.execution_type === 'action' && exec.edge_id)
          .forEach((exec) => {
            if (!edgeMap.has(exec.edge_id!)) {
              edgeMap.set(exec.edge_id!, {
                edge_name: exec.element_name || `Edge ${exec.edge_id!.slice(0, 8)}`,
                tree_name: treeMap[exec.tree_id] || exec.tree_name,
                script_executions: [],
              });
            }

            const scriptInfo = scriptResults.find((s) => s.id === exec.script_result_id);
            if (scriptInfo) {
              edgeMap.get(exec.edge_id!)!.script_executions.push({
                script_result_id: exec.script_result_id!,
                script_name: scriptInfo.script_name,
                success: exec.success,
                html_report_r2_url: scriptInfo.html_report_r2_url,
              });
            }
          });

        const edgeScriptDeps: EdgeScriptDependency[] = Array.from(edgeMap.entries()).map(
          ([edgeId, data]) => {
            // Group executions by script name
            const scriptGroups = new Map<
              string,
              Array<{
                success: boolean;
                html_report_r2_url: string | null;
                script_result_id: string;
              }>
            >();
            data.script_executions.forEach((exec) => {
              if (!scriptGroups.has(exec.script_name)) {
                scriptGroups.set(exec.script_name, []);
              }
              scriptGroups.get(exec.script_name)!.push({
                success: exec.success,
                html_report_r2_url: exec.html_report_r2_url,
                script_result_id: exec.script_result_id,
              });
            });

            const scripts = Array.from(scriptGroups.entries()).map(([scriptName, executions]) => {
              const successCount = executions.filter((e) => e.success).length;
              const htmlReport = executions[0]?.html_report_r2_url || null;

              return {
                script_result_id: executions[0].script_result_id, // Use first script_result_id for key
                script_name: scriptName,
                execution_count: executions.length,
                success_rate: (successCount / executions.length) * 100,
                html_report_r2_url: htmlReport,
              };
            });

            const totalExecutions = data.script_executions.length;
            const totalSuccesses = data.script_executions.filter((e) => e.success).length;

            return {
              edge_id: edgeId,
              edge_name: data.edge_name,
              tree_name: data.tree_name,
              scripts,
              total_executions: totalExecutions,
              overall_success_rate:
                totalExecutions > 0 ? (totalSuccesses / totalExecutions) * 100 : 0,
            };
          },
        );

        setScriptNodeDependencies(scriptNodeDeps);
        setScriptEdgeDependencies(scriptEdgeDeps);
        setNodeScriptDependencies(nodeScriptDeps);
        setEdgeScriptDependencies(edgeScriptDeps);
      } catch (err) {
        console.error('[@component:DependencyReport] Error loading dependency data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load dependency data');
      } finally {
        setLoading(false);
      }
    };

    loadDependencyData();
  }, [getAllScriptResults, getAllExecutionResults, getAllUserInterfaces]);

  // Filter functions
  const filteredScriptNodeDependencies = scriptNodeDependencies.filter(
    (script) =>
      script.script_name.toLowerCase().includes(scriptNodeFilter.toLowerCase()) ||
      (script.userinterface_name &&
        script.userinterface_name.toLowerCase().includes(scriptNodeFilter.toLowerCase())),
  );

  const filteredScriptEdgeDependencies = scriptEdgeDependencies.filter(
    (script) =>
      script.script_name.toLowerCase().includes(scriptEdgeFilter.toLowerCase()) ||
      (script.userinterface_name &&
        script.userinterface_name.toLowerCase().includes(scriptEdgeFilter.toLowerCase())),
  );

  const filteredNodeScriptDependencies = nodeScriptDependencies.filter(
    (node) =>
      node.node_name.toLowerCase().includes(nodeScriptFilter.toLowerCase()) ||
      node.tree_name.toLowerCase().includes(nodeScriptFilter.toLowerCase()),
  );

  const filteredEdgeScriptDependencies = edgeScriptDependencies.filter(
    (edge) =>
      edge.edge_name.toLowerCase().includes(edgeScriptFilter.toLowerCase()) ||
      edge.tree_name.toLowerCase().includes(edgeScriptFilter.toLowerCase()),
  );

  // Helper functions
  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return 'success';
    if (rate >= 60) return 'warning';
    return 'error';
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
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
            <Tab label="Script → Nodes" />
            <Tab label="Script → Edges" />
            <Tab label="Node → Scripts" />
            <Tab label="Edge → Scripts" />
          </Tabs>

          {/* Tab 1: Script → Nodes */}
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
                  Script → Node Dependencies ({filteredScriptNodeDependencies.length})
                </Typography>
                <SearchField
                  value={scriptNodeFilter}
                  onChange={setScriptNodeFilter}
                  placeholder="Search scripts..."
                />
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table
                  size="small"
                  sx={{
                    '& .MuiTableRow-root:hover': { backgroundColor: 'transparent !important' },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell width="50"></TableCell>
                      <TableCell>
                        <strong>Script</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Interface</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Nodes Used</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <LoadingState />
                        </TableCell>
                      </TableRow>
                    ) : filteredScriptNodeDependencies.length === 0 ? (
                      <EmptyState message="No script-node dependencies found" />
                    ) : (
                      filteredScriptNodeDependencies.map((script) => (
                        <React.Fragment key={script.script_result_id}>
                          <TableRow
                            sx={{
                              '&:hover': {
                                backgroundColor: 'transparent !important',
                              },
                            }}
                          >
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  toggleRowExpansion(`script-node-${script.script_result_id}`)
                                }
                              >
                                {expandedRows.has(`script-node-${script.script_result_id}`) ? (
                                  <ExpandLess />
                                ) : (
                                  <ExpandMore />
                                )}
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {script.script_name}
                              </Typography>
                            </TableCell>
                            <TableCell>{script.userinterface_name || 'N/A'}</TableCell>
                            <TableCell>
                              <Typography variant="body2" color="textSecondary">
                                {script.nodes.length} nodes
                              </Typography>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={4} sx={{ p: 0 }}>
                              <Collapse
                                in={expandedRows.has(`script-node-${script.script_result_id}`)}
                              >
                                <Box sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                                  <Table
                                    size="small"
                                    sx={{
                                      '& .MuiTableRow-root:hover': {
                                        backgroundColor: 'transparent !important',
                                      },
                                    }}
                                  >
                                    <TableBody>
                                      {script.nodes.map((node) => (
                                        <TableRow
                                          key={node.node_id}
                                          sx={{
                                            '&:hover': {
                                              backgroundColor: 'transparent !important',
                                            },
                                          }}
                                        >
                                          <TableCell>
                                            <Box
                                              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                            >
                                              <VerificationIcon
                                                fontSize="small"
                                                color="secondary"
                                              />
                                              {node.node_name}
                                            </Box>
                                          </TableCell>
                                          <TableCell>{node.execution_count}</TableCell>
                                          <TableCell>
                                            <Chip
                                              label={`${node.success_rate.toFixed(1)}%`}
                                              color={getSuccessRateColor(node.success_rate)}
                                              size="small"
                                              variant="outlined"
                                            />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tab 2: Script → Edges */}
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
                  Script → Edge Dependencies ({filteredScriptEdgeDependencies.length})
                </Typography>
                <SearchField
                  value={scriptEdgeFilter}
                  onChange={setScriptEdgeFilter}
                  placeholder="Search scripts..."
                />
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table
                  size="small"
                  sx={{
                    '& .MuiTableRow-root:hover': { backgroundColor: 'transparent !important' },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell width="50"></TableCell>
                      <TableCell>
                        <strong>Script</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Interface</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Edges Used</strong>
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <LoadingState />
                        </TableCell>
                      </TableRow>
                    ) : filteredScriptEdgeDependencies.length === 0 ? (
                      <EmptyState message="No script-edge dependencies found" />
                    ) : (
                      filteredScriptEdgeDependencies.map((script) => (
                        <React.Fragment key={script.script_result_id}>
                          <TableRow
                            sx={{
                              '&:hover': {
                                backgroundColor: 'transparent !important',
                              },
                            }}
                          >
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  toggleRowExpansion(`script-edge-${script.script_result_id}`)
                                }
                              >
                                {expandedRows.has(`script-edge-${script.script_result_id}`) ? (
                                  <ExpandLess />
                                ) : (
                                  <ExpandMore />
                                )}
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {script.script_name}
                              </Typography>
                            </TableCell>
                            <TableCell>{script.userinterface_name || 'N/A'}</TableCell>
                            <TableCell>
                              <Typography variant="body2" color="textSecondary">
                                {script.edges.length} edges
                              </Typography>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={4} sx={{ p: 0 }}>
                              <Collapse
                                in={expandedRows.has(`script-edge-${script.script_result_id}`)}
                              >
                                <Box sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                                  <Table
                                    size="small"
                                    sx={{
                                      '& .MuiTableRow-root:hover': {
                                        backgroundColor: 'transparent !important',
                                      },
                                    }}
                                  >
                                    <TableBody>
                                      {script.edges.map((edge) => (
                                        <TableRow
                                          key={edge.edge_id}
                                          sx={{
                                            '&:hover': {
                                              backgroundColor: 'transparent !important',
                                            },
                                          }}
                                        >
                                          <TableCell>
                                            <Box
                                              sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                                            >
                                              <ActionIcon fontSize="small" color="primary" />
                                              {edge.edge_name}
                                            </Box>
                                          </TableCell>
                                          <TableCell>{edge.execution_count}</TableCell>
                                          <TableCell>
                                            <Chip
                                              label={`${edge.success_rate.toFixed(1)}%`}
                                              color={getSuccessRateColor(edge.success_rate)}
                                              size="small"
                                              variant="outlined"
                                            />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tab 3: Node → Scripts */}
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
                  Node → Script Dependencies ({filteredNodeScriptDependencies.length})
                </Typography>
                <SearchField
                  value={nodeScriptFilter}
                  onChange={setNodeScriptFilter}
                  placeholder="Search nodes..."
                />
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table
                  size="small"
                  sx={{
                    '& .MuiTableRow-root:hover': { backgroundColor: 'transparent !important' },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell width="50"></TableCell>
                      <TableCell>
                        <strong>Node</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Interface</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Overall Success Rate</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Used by Scripts</strong>
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
                    ) : filteredNodeScriptDependencies.length === 0 ? (
                      <EmptyState message="No node-script dependencies found" />
                    ) : (
                      filteredNodeScriptDependencies.map((node) => (
                        <React.Fragment key={node.node_id}>
                          <TableRow
                            sx={{
                              '&:hover': {
                                backgroundColor: 'transparent !important',
                              },
                            }}
                          >
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => toggleRowExpansion(`node-script-${node.node_id}`)}
                              >
                                {expandedRows.has(`node-script-${node.node_id}`) ? (
                                  <ExpandLess />
                                ) : (
                                  <ExpandMore />
                                )}
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <VerificationIcon fontSize="small" color="secondary" />
                                <Typography variant="body2" fontWeight="medium">
                                  {node.node_name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{node.tree_name}</TableCell>
                            <TableCell>
                              <Chip
                                label={`${node.overall_success_rate.toFixed(1)}%`}
                                color={getSuccessRateColor(node.overall_success_rate)}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="textSecondary">
                                {node.scripts.length} unique scripts
                              </Typography>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={5} sx={{ p: 0 }}>
                              <Collapse in={expandedRows.has(`node-script-${node.node_id}`)}>
                                <Box sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                                  <Table
                                    size="small"
                                    sx={{
                                      '& .MuiTableRow-root:hover': {
                                        backgroundColor: 'transparent !important',
                                      },
                                    }}
                                  >
                                    <TableBody>
                                      {node.scripts.map((script) => (
                                        <TableRow
                                          key={script.script_result_id}
                                          sx={{
                                            '&:hover': {
                                              backgroundColor: 'transparent !important',
                                            },
                                          }}
                                        >
                                          <TableCell>{script.script_name}</TableCell>
                                          <TableCell>{script.execution_count}</TableCell>
                                          <TableCell>
                                            <Chip
                                              label={`${script.success_rate.toFixed(1)}%`}
                                              color={getSuccessRateColor(script.success_rate)}
                                              size="small"
                                              variant="outlined"
                                            />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Tab 4: Edge → Scripts */}
          {activeTab === 3 && (
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
                  Edge → Script Dependencies ({filteredEdgeScriptDependencies.length})
                </Typography>
                <SearchField
                  value={edgeScriptFilter}
                  onChange={setEdgeScriptFilter}
                  placeholder="Search edges..."
                />
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table
                  size="small"
                  sx={{
                    '& .MuiTableRow-root:hover': { backgroundColor: 'transparent !important' },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell width="50"></TableCell>
                      <TableCell>
                        <strong>Edge</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Interface</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Overall Success Rate</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Used by Scripts</strong>
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
                    ) : filteredEdgeScriptDependencies.length === 0 ? (
                      <EmptyState message="No edge-script dependencies found" />
                    ) : (
                      filteredEdgeScriptDependencies.map((edge) => (
                        <React.Fragment key={edge.edge_id}>
                          <TableRow
                            sx={{
                              '&:hover': {
                                backgroundColor: 'transparent !important',
                              },
                            }}
                          >
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => toggleRowExpansion(`edge-script-${edge.edge_id}`)}
                              >
                                {expandedRows.has(`edge-script-${edge.edge_id}`) ? (
                                  <ExpandLess />
                                ) : (
                                  <ExpandMore />
                                )}
                              </IconButton>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <ActionIcon fontSize="small" color="primary" />
                                <Typography variant="body2" fontWeight="medium">
                                  {edge.edge_name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{edge.tree_name}</TableCell>
                            <TableCell>
                              <Chip
                                label={`${edge.overall_success_rate.toFixed(1)}%`}
                                color={getSuccessRateColor(edge.overall_success_rate)}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="textSecondary">
                                {edge.scripts.length} unique scripts
                              </Typography>
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell colSpan={5} sx={{ p: 0 }}>
                              <Collapse in={expandedRows.has(`edge-script-${edge.edge_id}`)}>
                                <Box sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                                  <Table
                                    size="small"
                                    sx={{
                                      '& .MuiTableRow-root:hover': {
                                        backgroundColor: 'transparent !important',
                                      },
                                    }}
                                  >
                                    <TableBody>
                                      {edge.scripts.map((script) => (
                                        <TableRow
                                          key={script.script_result_id}
                                          sx={{
                                            '&:hover': {
                                              backgroundColor: 'transparent !important',
                                            },
                                          }}
                                        >
                                          <TableCell>{script.script_name}</TableCell>
                                          <TableCell>{script.execution_count}</TableCell>
                                          <TableCell>
                                            <Chip
                                              label={`${script.success_rate.toFixed(1)}%`}
                                              color={getSuccessRateColor(script.success_rate)}
                                              size="small"
                                              variant="outlined"
                                            />
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
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
