import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { 
  Container, 
  AppBar, 
  Toolbar, 
  Typography, 
  Box,
} from '@mui/material';
import { Science } from '@mui/icons-material';

// Import existing pages
import TestCaseEditor from '../pages/testCaseEditor';
import CampaignEditor from '../pages/CampaignEditor';
import TreeEditor from '../pages/TreeEditor';
import Dashboard from '../pages/Dashboard';
import DeviceManagement from '../pages/DeviceManagement';

// Import new pages
import Collections from '../pages/Collections';
import RunTests from '../pages/RunTests';
import Monitoring from '../pages/Monitoring';
import TestReports from '../pages/TestReports';
import Controller from '../pages/Controller';
import Library from '../pages/Library';
import Environment from '../pages/Environment';

// Import navigation components
import NavigationBar from './components/Navigation/NavigationBar';
import ThemeToggle from './components/ThemeToggle';

const App: React.FC = () => {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Router>
        <AppBar position="static" elevation={1}>
          <Toolbar>
            <Science sx={{ mr: 2 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              VirtualPyTest
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              <NavigationBar />
            </Box>
            <ThemeToggle />
          </Toolbar>
        </AppBar>
        <Container 
          maxWidth="lg" 
          sx={{ 
            mt: 2, 
            mb: 2, 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch'
          }}
        >
          <Routes>
            {/* Dashboard */}
            <Route path="/" element={<Dashboard />} />
            
            {/* Test Plan Routes */}
            <Route path="/test-plan/test-cases" element={<TestCaseEditor />} />
            <Route path="/test-plan/campaigns" element={<CampaignEditor />} />
            <Route path="/test-plan/collections" element={<Collections />} />
            
            {/* Test Execution Routes */}
            <Route path="/test-execution/run-tests" element={<RunTests />} />
            <Route path="/test-execution/monitoring" element={<Monitoring />} />
            
            {/* Test Results Routes */}
            <Route path="/test-results/reports" element={<TestReports />} />
            
            {/* Configuration Routes */}
            <Route path="/configuration/devices" element={<DeviceManagement />} />
            <Route path="/configuration/ui-trees" element={<TreeEditor />} />
            <Route path="/configuration/controller" element={<Controller />} />
            <Route path="/configuration/library" element={<Library />} />
            <Route path="/configuration/environment" element={<Environment />} />
            
            {/* Legacy routes for backward compatibility */}
            <Route path="/testcases" element={<TestCaseEditor />} />
            <Route path="/campaigns" element={<CampaignEditor />} />
            <Route path="/trees" element={<TreeEditor />} />
            <Route path="/device-management" element={<DeviceManagement />} />
          </Routes>
        </Container>
      </Router>
    </Box>
  );
};

export default App; 