import { Science } from '@mui/icons-material';
import { Container, AppBar, Toolbar, Typography, Box, CircularProgress } from '@mui/material';
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Import navigation components (keep these as regular imports since they're always needed)
import NavigationBar from './components/navigation/Navigation_Bar';
import ThemeToggle from './components/common/ThemeToggle';
import Footer from './components/common/Footer';

// Import registration context
import { RegistrationProvider } from './contexts/RegistrationContext';

// Lazy load all pages for better performance and to avoid loading everything at once
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CampaignEditor = React.lazy(() => import('./pages/CampaignEditor'));
const Collections = React.lazy(() => import('./pages/Collections'));
const Controller = React.lazy(() => import('./pages/Controller'));
const DeviceManagement = React.lazy(() => import('./pages/DeviceManagement'));
const Environment = React.lazy(() => import('./pages/Environment'));
const Library = React.lazy(() => import('./pages/Library'));
const Models = React.lazy(() => import('./pages/Models'));
const Monitoring = React.lazy(() => import('./pages/Monitoring'));
const RunTests = React.lazy(() => import('./pages/RunTests'));
const TestReports = React.lazy(() => import('./pages/TestReports'));
const UserInterface = React.lazy(() => import('./pages/UserInterface'));
const TestCaseEditor = React.lazy(() => import('./pages/TestCaseEditor'));
const NavigationEditor = React.lazy(() => import('./pages/NavigationEditor'));

// Loading component for Suspense fallback
const LoadingSpinner: React.FC = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '200px',
      flexDirection: 'column',
      gap: 2
    }}
  >
    <CircularProgress />
    <Typography variant="body2" color="textSecondary">
      Loading...
    </Typography>
  </Box>
);

const App: React.FC = () => {
  return (
    <RegistrationProvider>
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Router
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
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
            <Suspense fallback={<LoadingSpinner />}>
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
            </Suspense>
          </Container>
          <Footer />
        </Router>
      </Box>
    </RegistrationProvider>
  );
};

export default App;
