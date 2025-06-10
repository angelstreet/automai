import { Science } from '@mui/icons-material';
import { Container, AppBar, Toolbar, Typography, Box } from '@mui/material';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import existing pages
import CampaignEditor from './pages/CampaignEditor';
import Collections from './pages/Collections';
import Controller from './pages/Controller';
import Dashboard from './pages/Dashboard';
import DeviceManagement from './pages/DeviceManagement';

// Import new pages
import Environment from './pages/Environment';
import Library from './pages/Library';
import Models from './pages/Models';
import Monitoring from './pages/Monitoring';
import RunTests from './pages/RunTests';
import TestReports from './pages/TestReports';
import UserInterface from './pages/UserInterface';
import TestCaseEditor from './pages/TestCaseEditor';
import NavigationEditor from './pages/NavigationEditor';

// Import navigation components
import NavigationBar from './components/navigation/Navigation_Bar';
import ThemeToggle from './components/common/ThemeToggle';
import Footer from './components/common/Footer';

// Import registration context
import { RegistrationProvider } from './contexts/RegistrationContext';

const App: React.FC = () => {
  return (
    <RegistrationProvider>
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
              alignItems: 'stretch',
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
              <Route path="/configuration" element={<Navigate to="/configuration/models" replace />} />
              <Route path="/configuration/" element={<Navigate to="/configuration/models" replace />} />
              <Route path="/configuration/devices" element={<DeviceManagement />} />
              <Route path="/configuration/models" element={<Models />} />
              <Route path="/configuration/interface" element={<UserInterface />} />
              <Route path="/configuration/controller" element={<Controller />} />
              <Route path="/configuration/library" element={<Library />} />
              <Route path="/configuration/environment" element={<Environment />} />

              {/* Navigation Editor Route */}
              <Route path="/navigation-editor/:treeName/:treeId" element={<NavigationEditor />} />
              <Route path="/navigation-editor/:treeName" element={<NavigationEditor />} />

            </Routes>
          </Container>
          <Footer />
        </Router>
      </Box>
    </RegistrationProvider>
  );
};

export default App;
