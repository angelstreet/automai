import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, AppBar, Toolbar, Typography, Button } from '@mui/material';
import TestCaseEditor from './pages/testCaseEditor';
import CampaignEditor from './CampaignEditor';
import TreeEditor from './TreeEditor';

const App: React.FC = () => {
  return (
    <Router>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            VirtualPyTest
          </Typography>
          <Button color="inherit" component={Link} to="/testcases">Test Cases</Button>
          <Button color="inherit" component={Link} to="/campaigns">Campaigns</Button>
          <Button color="inherit" component={Link} to="/trees">Trees</Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ mt: 4 }}>
        <Routes>
          <Route path="/testcases" element={<TestCaseEditor />} />
          <Route path="/campaigns" element={<CampaignEditor />} />
          <Route path="/trees" element={<TreeEditor />} />
          <Route path="/" element={<Typography variant="h4">Welcome to VirtualPyTest</Typography>} />
        </Routes>
      </Container>
    </Router>
  );
};

export default App;