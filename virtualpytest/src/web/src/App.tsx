import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { 
  Container, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box,
  Tabs,
  Tab,
} from '@mui/material';
import { Science } from '@mui/icons-material';
import TestCaseEditor from '../pages/testCaseEditor';
import CampaignEditor from '../pages/CampaignEditor';
import TreeEditor from '../pages/TreeEditor';
import Dashboard from '../pages/Dashboard';
import DeviceManagement from '../pages/DeviceManagement';
import ThemeToggle from './components/ThemeToggle';

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

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
              <Tabs 
                value={currentTab} 
                onChange={handleTabChange}
                textColor="inherit"
                indicatorColor="secondary"
                sx={{ 
                  '& .MuiTab-root': { 
                    color: 'inherit',
                    minWidth: 'auto',
                    px: 2,
                  }
                }}
              >
                <Tab label="Dashboard" component={Link} to="/" />
                <Tab label="Test Cases" component={Link} to="/testcases" />
                <Tab label="Campaigns" component={Link} to="/campaigns" />
                <Tab label="Trees" component={Link} to="/trees" />
                <Tab label="Device Management" component={Link} to="/device-management" />
              </Tabs>
            </Box>
            <ThemeToggle />
          </Toolbar>
        </AppBar>
        <Container 
          maxWidth="lg" 
          sx={{ 
            mt: 4, 
            mb: 4, 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch'
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
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