import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Button,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Tabs,
  Tab,
} from '@mui/material';
import { ArrowBack, Edit, Delete, ExitToApp, Person, Add } from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { groupsApi } from '../api/groups';
import { commitmentsApi } from '../api/commitments';
import { liabilitiesApi } from '../api/liabilities';
import { Group, Commitment, Liability, ParsedCommitment } from '../types';
import { CommitmentCard } from '../components/CommitmentCard';
import { CreateCommitmentDialog } from '../components/CreateCommitmentDialog';
import { LiabilityDisplay } from '../components/LiabilityDisplay';

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Commitments state
  const [activeTab, setActiveTab] = useState(0);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [commitmentsLoading, setCommitmentsLoading] = useState(false);
  const [createCommitmentOpen, setCreateCommitmentOpen] = useState(false);
  const [commitmentError, setCommitmentError] = useState<string | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [commitmentToRevoke, setCommitmentToRevoke] = useState<Commitment | null>(null);
  const [commitmentToEdit, setCommitmentToEdit] = useState<Commitment | null>(null);
  
  // Liabilities state
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [liabilitiesLoading, setLiabilitiesLoading] = useState(false);
  const [calculatedAt, setCalculatedAt] = useState<string | null>(null);

  const loadGroup = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await groupsApi.get(id);
      setGroup(data);
      setEditName(data.name);
      setEditDescription(data.description || '');
      // Load commitments and liabilities after loading group
      loadCommitments();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const loadCommitments = async () => {
    if (!id) return;
    try {
      setCommitmentsLoading(true);
      setCommitmentError(null);
      const data = await commitmentsApi.list({ groupId: id });
      setCommitments(data.commitments);
    } catch (err: any) {
      setCommitmentError(err.response?.data?.message || 'Failed to load commitments');
    } finally {
      setCommitmentsLoading(false);
    }
  };

  const loadLiabilities = async () => {
    if (!id) return;
    try {
      setLiabilitiesLoading(true);
      const data = await liabilitiesApi.getGroupLiabilities(id);
      setLiabilities(data.liabilities);
      setCalculatedAt(data.calculatedAt);
    } catch (err: any) {
      // Liabilities may not exist yet, that's ok
      setLiabilities([]);
    } finally {
      setLiabilitiesLoading(false);
    }
  };

  useEffect(() => {
    loadGroup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    // Load liabilities when switching to liabilities tab
    if (activeTab === 2 && id) {
      loadLiabilities();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleDelete = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await groupsApi.delete(id);
      navigate('/groups');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete group');
      setDeleteDialogOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      await groupsApi.leave(id);
      navigate('/groups');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to leave group');
      setLeaveDialogOpen(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await groupsApi.update(id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setGroup(updated);
      setEditDialogOpen(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update group');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCommitment = async (parsedCommitment: ParsedCommitment, naturalLanguageText?: string) => {
    if (!id) return;
    setActionLoading(true);
    setCommitmentError(null);
    try {
      if (commitmentToEdit) {
        // Edit mode
        await commitmentsApi.update(commitmentToEdit.id, {
          parsedCommitment,
          naturalLanguageText,
        });
        setCommitmentToEdit(null);
      } else {
        // Create mode
        await commitmentsApi.create({
          groupId: id,
          parsedCommitment,
          naturalLanguageText,
        });
      }
      setCreateCommitmentOpen(false);
      loadCommitments();
      // Refresh liabilities after creating a commitment
      if (activeTab === 2) {
        loadLiabilities();
      }
    } catch (err: any) {
      setCommitmentError(err.response?.data?.message || `Failed to ${commitmentToEdit ? 'update' : 'create'} commitment`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeCommitment = async () => {
    if (!commitmentToRevoke) return;
    setActionLoading(true);
    try {
      await commitmentsApi.revoke(commitmentToRevoke.id);
      setRevokeDialogOpen(false);
      setCommitmentToRevoke(null);
      loadCommitments();
      // Refresh liabilities after revoking a commitment
      if (activeTab === 2) {
        loadLiabilities();
      }
    } catch (err: any) {
      setCommitmentError(err.response?.data?.message || 'Failed to revoke commitment');
    } finally {
      setActionLoading(false);
    }
  };

  const openRevokeDialog = (commitment: Commitment) => {
    setCommitmentToRevoke(commitment);
    setRevokeDialogOpen(true);
  };

  const openEditDialog = (commitment: Commitment) => {
    setCommitmentToEdit(commitment);
    setCreateCommitmentOpen(true);
  };

  const isCreator = user?.id === group?.creatorId;

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            🥕 Carrots - Group Details
          </Typography>
          <Button color="inherit" onClick={() => navigate('/groups')} sx={{ mr: 2 }}>
            My Groups
          </Button>
          <Button color="inherit" onClick={() => navigate('/profile')} sx={{ mr: 2 }}>
            Profile
          </Button>
          <Button color="inherit" onClick={handleLogout}>
            Logout
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/groups')}
          sx={{ mb: 2 }}
        >
          Back to Groups
        </Button>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : group ? (
          <>
            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="h4" gutterBottom>
                    {group.name}
                  </Typography>
                  {isCreator && (
                    <Chip label="Creator" color="primary" size="small" sx={{ mb: 1 }} />
                  )}
                </Box>
                <Box>
                  {isCreator ? (
                    <>
                      <Button
                        startIcon={<Edit />}
                        onClick={() => setEditDialogOpen(true)}
                        sx={{ mr: 1 }}
                      >
                        Edit
                      </Button>
                      <Button
                        startIcon={<Delete />}
                        color="error"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        Delete
                      </Button>
                    </>
                  ) : (
                    <Button
                      startIcon={<ExitToApp />}
                      color="warning"
                      onClick={() => setLeaveDialogOpen(true)}
                    >
                      Leave
                    </Button>
                  )}
                </Box>
              </Box>

              <Typography variant="body1" color="text.secondary" paragraph>
                {group.description || 'No description provided'}
              </Typography>

              <Typography variant="caption" color="text.secondary">
                Created {new Date(group.createdAt).toLocaleDateString()}
              </Typography>
            </Paper>

            {/* Tabs for Members, Commitments, and Liabilities */}
            <Paper elevation={3} sx={{ mb: 3 }}>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label={`Members (${group.memberships?.length || 0})`} />
                <Tab label={`Commitments (${commitments.length})`} />
                <Tab label="Liabilities" />
              </Tabs>

              <Box sx={{ p: 3 }}>
                {/* Members Tab */}
                {activeTab === 0 && (
                  <List>
                    {group.memberships?.map((membership) => (
                      <ListItem key={membership.id}>
                        <ListItemAvatar>
                          <Avatar>
                            <Person />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={membership.user.username}
                          secondary={`${membership.user.email} • ${membership.role}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}

                {/* Commitments Tab */}
                {activeTab === 1 && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6">Group Commitments</Typography>
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setCreateCommitmentOpen(true)}
                      >
                        Create Commitment
                      </Button>
                    </Box>

                    {commitmentError && (
                      <Alert severity="error" sx={{ mb: 2 }}>
                        {commitmentError}
                      </Alert>
                    )}

                    {commitmentsLoading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : commitments.length === 0 ? (
                      <Alert severity="info">
                        No commitments yet. Create your first commitment to get started!
                      </Alert>
                    ) : (
                      <Box>
                        {commitments.map((commitment) => (
                          <CommitmentCard
                            key={commitment.id}
                            commitment={commitment}
                            currentUserId={user?.id || ''}
                            onEdit={openEditDialog}
                            onRevoke={openRevokeDialog}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                )}

                {/* Liabilities Tab */}
                {activeTab === 2 && (
                  <Box>
                    <LiabilityDisplay
                      liabilities={liabilities}
                      calculatedAt={calculatedAt || undefined}
                      loading={liabilitiesLoading}
                      onRefresh={loadLiabilities}
                    />
                  </Box>
                )}
              </Box>
            </Paper>
          </>
        ) : (
          <Alert severity="error">Group not found</Alert>
        )}
      </Container>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Group</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this group? This action cannot be undone.
            All commitments and data associated with this group will be permanently deleted.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button onClick={handleDelete} color="error" disabled={actionLoading}>
            {actionLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Leave Confirmation Dialog */}
      <Dialog open={leaveDialogOpen} onClose={() => setLeaveDialogOpen(false)}>
        <DialogTitle>Leave Group</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to leave this group? You will no longer see commitments
            or liabilities for this group.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLeaveDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button onClick={handleLeave} color="warning" disabled={actionLoading}>
            {actionLoading ? 'Leaving...' : 'Leave'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Group</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Group Name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
              fullWidth
              inputProps={{ maxLength: 100 }}
              helperText={`${editName.length}/100 characters`}
            />
            <TextField
              label="Description"
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
              inputProps={{ maxLength: 500 }}
              helperText={`${editDescription.length}/500 characters`}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} variant="contained" disabled={actionLoading || !editName.trim()}>
            {actionLoading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Commitment Dialog */}
      {group && (
        <CreateCommitmentDialog
          open={createCommitmentOpen}
          onClose={() => {
            setCreateCommitmentOpen(false);
            setCommitmentToEdit(null);
            setCommitmentError(null);
          }}
          onSubmit={handleCreateCommitment}
          members={(group.memberships || []).map(m => ({
            userId: m.user.id,
            username: m.user.username,
            email: m.user.email,
            role: m.role as 'creator' | 'member',
            joinedAt: m.joinedAt,
          }))}
          loading={actionLoading}
          error={commitmentError}
          initialCommitment={commitmentToEdit || undefined}
        />
      )}

      {/* Revoke Commitment Dialog */}
      <Dialog open={revokeDialogOpen} onClose={() => setRevokeDialogOpen(false)}>
        <DialogTitle>Revoke Commitment</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to revoke this commitment? This action cannot be undone.
            The commitment will be marked as revoked and will no longer affect liability calculations.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialogOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button onClick={handleRevokeCommitment} color="error" disabled={actionLoading}>
            {actionLoading ? 'Revoking...' : 'Revoke'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
