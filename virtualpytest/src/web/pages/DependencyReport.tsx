import {
  CheckCircle as PassIcon,
  Clear as ClearIcon,
  Error as FailIcon,
  PlayArrow as ActionIcon,
  Search as SearchIcon,
  Verified as VerificationIcon,
  Warning as WarningIcon,
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
import { useUserInterface } from '../hooks/pages/useUserInterface';

interface ScriptDependency {
  script_result_id: string;
  script_name: string;
  script_type: string;
  userinterface_name: string | null;
  success: boolean;
  elements: Array<{
    element_id: string;
    element_name: string;
    element_type: 'edge' | 'node';
    success: boolean;
    execution_count: number;
    success_rate: number;
  }>;
  total_elements: number;
  failed_elements: number;
}

interface ElementDependency {
  element_id: string;
  element_name: string;
  element_type: 'edge' | 'node';
  tree_name: string;
  scripts: Array<{
    script_result_id: string;
    script_name: string;
    script_type: string;
    success: boolean;
    execution_count: number;
    html_report_r2_url: string | null;
  }>;
  total_scripts: number;
  success_rate: number;
  risk_level: 'high' | 'medium' | 'low';
}

const DependencyReport: React.FC = () => {
  const { getAllScriptResults } = useScriptResults();
  const { getAllExecutionResults } = useExecutionResults();
  const { getAllUserInterfaces } = useUserInterface();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [scriptDependencies, setScriptDependencies] = useState<ScriptDependency[]>([]);
  const [elementDependencies, setElementDependencies] = useState<ElementDependency[]>([]);
  const [treeToInterfaceMap, setTreeToInterfaceMap] = useState<Record<string, string>>({});

  // Filter states
  const [scriptFilter, setScriptFilter] = useState('');
  const [elementFilter, setElementFilter] = useState('');

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

        // Process script dependencies
        const scriptDeps: ScriptDependency[] = [];

        for (const script of scriptResults) {
          const scriptExecutions = executionResults.filter(
            (exec) => exec.script_result_id === script.id,
          );

          const elementMap = new Map<
            string,
            {
              element_id: string;
              element_name: string;
              element_type: 'edge' | 'node';
              executions: Array<{ success: boolean }>;
            }
          >();

          // Group executions by element
          scriptExecutions.forEach((exec) => {
            const elementId = exec.edge_id || exec.node_id;
            const elementType = exec.edge_id ? 'edge' : 'node';

            if (elementId) {
              if (!elementMap.has(elementId)) {
                elementMap.set(elementId, {
                  element_id: elementId,
                  element_name: exec.element_name || `${elementType} ${elementId.slice(0, 8)}`,
                  element_type: elementType,
                  executions: [],
                });
              }
              elementMap.get(elementId)!.executions.push({ success: exec.success });
            }
          });

          // Calculate element metrics
          const elements = Array.from(elementMap.values()).map((element) => {
            const successCount = element.executions.filter((e) => e.success).length;
            const totalCount = element.executions.length;

            return {
              element_id: element.element_id,
              element_name: element.element_name,
              element_type: element.element_type,
              success: successCount === totalCount,
              execution_count: totalCount,
              success_rate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
            };
          });

          const failedElements = elements.filter((e) => !e.success).length;

          scriptDeps.push({
            script_result_id: script.id,
            script_name: script.script_name,
            script_type: script.script_type,
            userinterface_name: script.userinterface_name,
            success: script.success,
            elements,
            total_elements: elements.length,
            failed_elements: failedElements,
          });
        }

        // Process element dependencies
        const elementMap = new Map<
          string,
          {
            element_id: string;
            element_name: string;
            element_type: 'edge' | 'node';
            tree_name: string;
            script_executions: Array<{
              script_result_id: string;
              script_name: string;
              script_type: string;
              success: boolean;
              html_report_r2_url: string | null;
            }>;
          }
        >();

        executionResults.forEach((exec) => {
          const elementId = exec.edge_id || exec.node_id;
          const elementType = exec.edge_id ? 'edge' : 'node';

          if (elementId && exec.script_result_id) {
            if (!elementMap.has(elementId)) {
              elementMap.set(elementId, {
                element_id: elementId,
                element_name: exec.element_name || `${elementType} ${elementId.slice(0, 8)}`,
                element_type: elementType,
                tree_name: treeMap[exec.tree_id] || exec.tree_name,
                script_executions: [],
              });
            }

            const scriptInfo = scriptResults.find((s) => s.id === exec.script_result_id);
            if (scriptInfo) {
              const existing = elementMap
                .get(elementId)!
                .script_executions.find((s) => s.script_result_id === exec.script_result_id);

              if (!existing) {
                elementMap.get(elementId)!.script_executions.push({
                  script_result_id: exec.script_result_id,
                  script_name: scriptInfo.script_name,
                  script_type: scriptInfo.script_type,
                  success: exec.success,
                  html_report_r2_url: scriptInfo.html_report_r2_url,
                });
              }
            }
          }
        });

        // Calculate element metrics and risk levels
        const elementDeps: ElementDependency[] = Array.from(elementMap.values()).map((element) => {
          const scriptGroups = new Map<string, { executions: Array<{ success: boolean }> }>();

          // Group executions by script
          executionResults
            .filter((exec) => (exec.edge_id || exec.node_id) === element.element_id)
            .forEach((exec) => {
              if (exec.script_result_id) {
                if (!scriptGroups.has(exec.script_result_id)) {
                  scriptGroups.set(exec.script_result_id, { executions: [] });
                }
                scriptGroups.get(exec.script_result_id)!.executions.push({ success: exec.success });
              }
            });

          // Calculate success rate across all executions
          const allExecutions = Array.from(scriptGroups.values()).flatMap((g) => g.executions);
          const successCount = allExecutions.filter((e) => e.success).length;
          const totalCount = allExecutions.length;
          const successRate = totalCount > 0 ? (successCount / totalCount) * 100 : 0;

          // Calculate script-level metrics
          const scripts = element.script_executions.map((script) => {
            const scriptExecutions = scriptGroups.get(script.script_result_id)?.executions || [];
            return {
              ...script,
              execution_count: scriptExecutions.length,
            };
          });

          // Determine risk level
          let riskLevel: 'high' | 'medium' | 'low' = 'low';
          if (successRate < 50 && scripts.length > 1) riskLevel = 'high';
          else if (successRate < 80 || scripts.length > 2) riskLevel = 'medium';

          return {
            element_id: element.element_id,
            element_name: element.element_name,
            element_type: element.element_type,
            tree_name: element.tree_name,
            scripts,
            total_scripts: scripts.length,
            success_rate: successRate,
            risk_level: riskLevel,
          };
        });

        setScriptDependencies(scriptDeps);
        setElementDependencies(elementDeps);
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
  const filteredScriptDependencies = scriptDependencies.filter(
    (script) =>
      script.script_name.toLowerCase().includes(scriptFilter.toLowerCase()) ||
      script.script_type.toLowerCase().includes(scriptFilter.toLowerCase()) ||
      (script.userinterface_name &&
        script.userinterface_name.toLowerCase().includes(scriptFilter.toLowerCase())),
  );

  const filteredElementDependencies = elementDependencies.filter(
    (element) =>
      element.element_name.toLowerCase().includes(elementFilter.toLowerCase()) ||
      element.tree_name.toLowerCase().includes(elementFilter.toLowerCase()),
  );

  // Helper functions
  const getRiskColor = (riskLevel: 'high' | 'medium' | 'low') => {
    switch (riskLevel) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
    }
  };

  const getRiskIcon = (riskLevel: 'high' | 'medium' | 'low') => {
    switch (riskLevel) {
      case 'high':
        return <FailIcon />;
      case 'medium':
        return <WarningIcon />;
      case 'low':
        return <PassIcon />;
    }
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
          Track which elements each script depends on and which scripts use each element
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
            <Tab label="Script → Elements" />
            <Tab label="Element → Scripts" />
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
                        <strong>Script</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Status</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Interface</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Elements Used</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Failed Elements</strong>
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
                    ) : filteredScriptDependencies.length === 0 ? (
                      <EmptyState message="No script dependencies found" />
                    ) : (
                      filteredScriptDependencies.map((script) => (
                        <TableRow
                          key={script.script_result_id}
                          sx={{
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            },
                          }}
                        >
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {script.script_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {script.script_type}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={script.success ? <PassIcon /> : <FailIcon />}
                              label={script.success ? 'PASS' : 'FAIL'}
                              color={script.success ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{script.userinterface_name || 'N/A'}</TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                              {script.elements.slice(0, 4).map((element) => (
                                <Chip
                                  key={element.element_id}
                                  icon={
                                    element.element_type === 'edge' ? (
                                      <ActionIcon />
                                    ) : (
                                      <VerificationIcon />
                                    )
                                  }
                                  label={element.element_name}
                                  size="small"
                                  variant="outlined"
                                  color={element.success ? 'success' : 'error'}
                                />
                              ))}
                              {script.elements.length > 4 && (
                                <Chip
                                  label={`+${script.elements.length - 4} more`}
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            {script.failed_elements > 0 ? (
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {script.elements
                                  .filter((e) => !e.success)
                                  .slice(0, 3)
                                  .map((element) => (
                                    <Chip
                                      key={element.element_id}
                                      icon={
                                        element.element_type === 'edge' ? (
                                          <ActionIcon />
                                        ) : (
                                          <VerificationIcon />
                                        )
                                      }
                                      label={element.element_name}
                                      size="small"
                                      color="error"
                                    />
                                  ))}
                                {script.elements.filter((e) => !e.success).length > 3 && (
                                  <Chip
                                    label={`+${script.elements.filter((e) => !e.success).length - 3} more`}
                                    size="small"
                                    color="error"
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="textSecondary">
                                None
                              </Typography>
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

          {/* Tab 2: Element Dependencies */}
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
                  Element Dependencies ({filteredElementDependencies.length})
                </Typography>
                <SearchField
                  value={elementFilter}
                  onChange={setElementFilter}
                  placeholder="Search elements..."
                />
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>
                        <strong>Element</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Interface</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Risk Level</strong>
                      </TableCell>
                      <TableCell>
                        <strong>Success Rate</strong>
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
                    ) : filteredElementDependencies.length === 0 ? (
                      <EmptyState message="No element dependencies found" />
                    ) : (
                      filteredElementDependencies
                        .sort((a, b) => {
                          // Sort by risk level (high first), then by success rate (low first)
                          if (a.risk_level !== b.risk_level) {
                            const riskOrder = { high: 0, medium: 1, low: 2 };
                            return riskOrder[a.risk_level] - riskOrder[b.risk_level];
                          }
                          return a.success_rate - b.success_rate;
                        })
                        .map((element) => (
                          <TableRow
                            key={element.element_id}
                            sx={{
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              },
                            }}
                          >
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {element.element_type === 'edge' ? (
                                  <ActionIcon fontSize="small" color="primary" />
                                ) : (
                                  <VerificationIcon fontSize="small" color="secondary" />
                                )}
                                <Typography variant="body2" fontWeight="medium">
                                  {element.element_name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>{element.tree_name}</TableCell>
                            <TableCell>
                              <Chip
                                icon={getRiskIcon(element.risk_level)}
                                label={element.risk_level.toUpperCase()}
                                color={getRiskColor(element.risk_level)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${element.success_rate.toFixed(1)}%`}
                                color={
                                  element.success_rate >= 80
                                    ? 'success'
                                    : element.success_rate >= 60
                                      ? 'warning'
                                      : 'error'
                                }
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                {element.scripts.slice(0, 3).map((script) => (
                                  <Chip
                                    key={script.script_result_id}
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
                                {element.scripts.length > 3 && (
                                  <Chip
                                    label={`+${element.scripts.length - 3} more`}
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
