import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/users';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  AppBar,
  Toolbar,
  Alert,
  CircularProgress,
} from '@mui/material';

export default function UserSettingsPage() {
  const { user: currentUser, updateUserProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleBackToProfile = () => {
    navigate('/profile');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    // Validate at least one field changed
    if (username === currentUser.username && email === currentUser.email) {
      setError('No changes detected');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const updateData: { username?: string; email?: string } = {};
      
      if (username !== currentUser.username) {
        updateData.username = username;
      }
      if (email !== currentUser.email) {
        updateData.email = email;
      }

      const updatedUser = await usersApi.updateUser(currentUser.id, updateData);
      
      // Update user in auth context
      updateUserProfile(updatedUser);
      
      setSuccess('Profile updated successfully!');
      
      // Redirect to profile page after a short delay
      setTimeout(() => {
        navigate('/profile');
      }, 1500);
    } catch (err: any) {
      console.error('Update profile error:', err);
      
      // Handle specific error messages from backend
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 409) {
        setError('Username or email already taken');
      } else if (err.response?.status === 400) {
        setError('Invalid input. Please check your data.');
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return (
      <Container>
        <CircularProgress />
      </Container>
    );
  }

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🥕 Carrots - Settings
          </Typography>
          <Button color="inherit" onClick={handleBackToProfile} sx={{ mr: 2 }}>
            Profile
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Edit Profile
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              required
              helperText="Must be 3-30 characters, letters, numbers, underscores, and hyphens only"
              inputProps={{
                minLength: 3,
                maxLength: 30,
                pattern: '^[a-zA-Z0-9_-]+$',
              }}
              disabled={loading}
            />

            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              helperText="We'll send notifications to this email"
              disabled={loading}
            />

            <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                disabled={loading}
                sx={{ minWidth: 120 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Save Changes'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleBackToProfile}
                disabled={loading}
              >
                Cancel
              </Button>
            </Box>
          </Box>

          <Box sx={{ mt: 4, pt: 3, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Note:</strong> Changing your email or username will not affect your
              existing commitments or group memberships. However, other group members will
              see your updated username.
            </Typography>
          </Box>
        </Paper>
      </Container>
    </>
  );
}
