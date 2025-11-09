import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './hooks/useAuth';

// Import pages (to be created)
// import LandingPage from './pages/LandingPage';
// import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage';
// import DashboardPage from './pages/DashboardPage';
// import GroupPage from './pages/GroupPage';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#FF6B35', // Carrot orange
    },
    secondary: {
      main: '#004E89',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<div>Landing Page - Coming Soon</div>} />
            <Route path="/login" element={<div>Login Page - Coming Soon</div>} />
            <Route path="/register" element={<div>Register Page - Coming Soon</div>} />
            <Route path="/dashboard" element={<div>Dashboard - Coming Soon</div>} />
            <Route path="/groups/:id" element={<div>Group Page - Coming Soon</div>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
