import {
  Science as TestIcon,
  Campaign as CampaignIcon,
  PlayArrow as RunIcon,
  Visibility as MonitorIcon,
  Assessment as ReportsIcon,
  Devices as DevicesIcon,
  AccountTree as TreeIcon,
  Settings as SettingsIcon,
  Storage as CollectionIcon,
  Gamepad as ControllerIcon,
  LibraryBooks as LibraryIcon,
  Memory as ModelIcon,
  BugReport as TestingIcon,
} from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

import NavigationDropdown from './Navigation_Dropdown';

const NavigationBar: React.FC = () => {
  const location = useLocation();

  // Navigation menu configuration
  const testPlanItems = [
    { label: 'Test Cases', path: '/test-plan/test-cases', icon: <TestIcon fontSize="small" /> },
    { label: 'Campaigns', path: '/test-plan/campaigns', icon: <CampaignIcon fontSize="small" /> },
    {
      label: 'Collections',
      path: '/test-plan/collections',
      icon: <CollectionIcon fontSize="small" />,
    },
  ];

  const testExecutionItems = [
    { label: 'Run Tests', path: '/test-execution/run-tests', icon: <RunIcon fontSize="small" /> },
    {
      label: 'Monitoring',
      path: '/test-execution/monitoring',
      icon: <MonitorIcon fontSize="small" />,
    },
  ];

  const testResultsItems = [
    {
      label: 'Test Reports',
      path: '/test-results/reports',
      icon: <ReportsIcon fontSize="small" />,
    },
    {
      label: 'Model Reports',
      path: '/test-results/model-reports',
      icon: <ModelIcon fontSize="small" />,
    },
  ];

  const configurationItems = [
    {
      label: 'Device',
      path: '/configuration/devices',
      icon: <DevicesIcon fontSize="small" />,
    },
    {
      label: 'Models',
      path: '/configuration/models',
      icon: <ModelIcon fontSize="small" />,
    },
    {
      label: 'User Interface',
      path: '/configuration/interface',
      icon: <TreeIcon fontSize="small" />,
    },
    {
      label: 'Controller',
      path: '/configuration/controller',
      icon: <ControllerIcon fontSize="small" />,
    },
    { label: 'Library', path: '/configuration/library', icon: <LibraryIcon fontSize="small" /> },
    {
      label: 'Environment',
      path: '/configuration/environment',
      icon: <SettingsIcon fontSize="small" />,
    },
    {
      label: 'Remote Test',
      path: '/remote-test',
      icon: <TestingIcon fontSize="small" />,
    },
  ];

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {/* Dashboard - Simple button */}
      <Button
        component={Link}
        to="/"
        sx={{
          color: location.pathname === '/' ? 'secondary.main' : 'inherit',
          fontWeight: location.pathname === '/' ? 600 : 400,
          textTransform: 'none',
          px: 2,
          py: 1,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        Dashboard
      </Button>

      {/* Rec - Simple button */}
      <Button
        component={Link}
        to="/rec"
        startIcon={<MonitorIcon fontSize="small" />}
        sx={{
          color: location.pathname === '/rec' ? 'secondary.main' : 'inherit',
          fontWeight: location.pathname === '/rec' ? 600 : 400,
          textTransform: 'none',
          px: 2,
          py: 1,
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        Rec
      </Button>

      {/* Test Plan Dropdown */}
      <NavigationDropdown label="Test Plan" items={testPlanItems} />

      {/* Test Execution Dropdown */}
      <NavigationDropdown label="Test Execution" items={testExecutionItems} />

      {/* Test Results Dropdown */}
      <NavigationDropdown label="Test Results" items={testResultsItems} />

      {/* Configuration Dropdown */}
      <NavigationDropdown label="Configuration" items={configurationItems} />
    </Box>
  );
};

export default NavigationBar;
