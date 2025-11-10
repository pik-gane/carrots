import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  AppBar,
  Toolbar,
} from '@mui/material';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🥕 Carrots - Dashboard
          </Typography>
          <Button color="inherit" onClick={() => navigate('/groups')} sx={{ mr: 2 }}>
            Groups
          </Button>
          <Button color="inherit" onClick={() => navigate('/profile')} sx={{ mr: 2 }}>
            Profile
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Welcome, {user?.username}!
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1">
              <strong>Email:</strong> {user?.email}
            </Typography>
            <Typography variant="body1" sx={{ mt: 1 }}>
              <strong>User ID:</strong> {user?.id}
            </Typography>
          </Box>
          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Get started by visiting your groups page to create or join groups!
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => navigate('/groups')} 
              sx={{ mt: 2 }}
            >
              Go to Groups
            </Button>
          </Box>
        </Paper>
      </Container>
    </>
  );
}
