import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import TestCaseEditor from '../pages/TestCaseEditor';
import CampaignEditor from '../pages/CampaignEditor';
import TreeEditor from '../pages/TreeEditor';
import Dashboard from '../pages/Dashboard';

const App: React.FC = () => {
  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            VirtualPyTest
          </Typography>
          <Button color="inherit" component={Link} to="/">Dashboard</Button>
          <Button color="inherit" component={Link} to="/testcases">Test Cases</Button>
          <Button color="inherit" component={Link} to="/campaigns">Campaigns</Button>
          <Button color="inherit" component={Link} to="/trees">Trees</Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/testcases" element={<TestCaseEditor />} />
          <Route path="/campaigns" element={<CampaignEditor />} />
          <Route path="/trees" element={<TreeEditor />} />
        </Routes>
      </Container>
    </Router>
  );
};

export default App; 