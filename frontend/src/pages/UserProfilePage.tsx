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
  AppBar,
  Toolbar,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';

export default function UserProfilePage() {
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleEditProfile = () => {
    navigate('/settings');
  };

  const handleDeleteAccount = async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      await usersApi.deleteUser(currentUser.id);
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Delete account error:', err);
      setError('Failed to delete account. Please try again.');
    } finally {
      setLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
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
            🥕 Carrots - User Profile
          </Typography>
          <Button color="inherit" onClick={handleBackToDashboard} sx={{ mr: 2 }}>
            Dashboard
          </Button>
          <Button color="inherit" onClick={() => navigate('/groups')} sx={{ mr: 2 }}>
            Groups
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" gutterBottom>
            Your Profile
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Username
            </Typography>
            <Typography variant="h6" gutterBottom>
              {currentUser.username}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Email
            </Typography>
            <Typography variant="h6" gutterBottom>
              {currentUser.email}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              User ID
            </Typography>
            <Typography variant="body1" gutterBottom>
              {currentUser.id}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
              Member Since
            </Typography>
            <Typography variant="body1" gutterBottom>
              {new Date(currentUser.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Typography>
          </Box>

          <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleEditProfile}
              disabled={loading}
            >
              Edit Profile
            </Button>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={loading}
            >
              Delete Account
            </Button>
          </Box>
        </Paper>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => setDeleteDialogOpen(false)}
        >
          <DialogTitle>Delete Account</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete your account? This action cannot be undone.
              All your commitments and group memberships will be removed.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteDialogOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleDeleteAccount}
              color="error"
              disabled={loading}
              autoFocus
            >
              {loading ? <CircularProgress size={24} /> : 'Delete Account'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </>
  );
}
