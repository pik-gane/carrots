import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Alert,
  Divider,
  Typography,
} from '@mui/material';
import { ParsedCommitment, GroupMember } from '../types';

interface CreateCommitmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (commitment: ParsedCommitment, naturalLanguageText?: string) => void;
  members: GroupMember[];
  loading?: boolean;
  error?: string | null;
}

export function CreateCommitmentDialog({
  open,
  onClose,
  onSubmit,
  members,
  loading = false,
  error = null,
}: CreateCommitmentDialogProps) {
  const [conditionType, setConditionType] = useState<'single_user' | 'aggregate'>('single_user');
  const [targetUserId, setTargetUserId] = useState('');
  const [conditionAction, setConditionAction] = useState('');
  const [conditionAmount, setConditionAmount] = useState('');
  const [conditionUnit, setConditionUnit] = useState('');
  const [promiseAction, setPromiseAction] = useState('');
  const [promiseAmount, setPromiseAmount] = useState('');
  const [promiseUnit, setPromiseUnit] = useState('');
  const [naturalLanguageText, setNaturalLanguageText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setConditionType('single_user');
      setTargetUserId('');
      setConditionAction('');
      setConditionAmount('');
      setConditionUnit('');
      setPromiseAction('');
      setPromiseAmount('');
      setPromiseUnit('');
      setNaturalLanguageText('');
      setValidationError(null);
    }
  }, [open]);

  const handleSubmit = () => {
    // Validate inputs
    if (!conditionAction.trim()) {
      setValidationError('Condition action is required');
      return;
    }
    if (!conditionAmount || parseFloat(conditionAmount) <= 0) {
      setValidationError('Condition amount must be greater than 0');
      return;
    }
    if (!conditionUnit.trim()) {
      setValidationError('Condition unit is required');
      return;
    }
    if (conditionType === 'single_user' && !targetUserId) {
      setValidationError('Target user is required for single user condition');
      return;
    }
    if (!promiseAction.trim()) {
      setValidationError('Promise action is required');
      return;
    }
    if (!promiseAmount || parseFloat(promiseAmount) <= 0) {
      setValidationError('Promise amount must be greater than 0');
      return;
    }
    if (!promiseUnit.trim()) {
      setValidationError('Promise unit is required');
      return;
    }

    const targetMember = members.find(m => m.userId === targetUserId);
    const parsedCommitment: ParsedCommitment = {
      condition: {
        type: conditionType,
        targetUserId: conditionType === 'single_user' ? targetUserId : undefined,
        targetUsername: conditionType === 'single_user' && targetMember ? targetMember.username : undefined,
        action: conditionAction.trim(),
        minAmount: parseFloat(conditionAmount),
        unit: conditionUnit.trim(),
      },
      promise: {
        action: promiseAction.trim(),
        minAmount: parseFloat(promiseAmount),
        unit: promiseUnit.trim(),
      },
    };

    onSubmit(parsedCommitment, naturalLanguageText.trim() || undefined);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Create New Commitment</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {(error || validationError) && (
            <Alert severity="error" onClose={() => setValidationError(null)}>
              {error || validationError}
            </Alert>
          )}

          <TextField
            label="Natural Language (Optional)"
            value={naturalLanguageText}
            onChange={(e) => setNaturalLanguageText(e.target.value)}
            multiline
            rows={2}
            placeholder='e.g., "If Alice completes at least 5 hours of work, I will complete at least 3 hours of work"'
            fullWidth
            helperText="You can describe your commitment in plain English. This is for reference only."
          />

          <Divider />

          <Typography variant="h6" sx={{ mt: 1 }}>Condition</Typography>
          <Typography variant="body2" color="text.secondary">
            What needs to happen for your promise to activate?
          </Typography>

          <FormControl component="fieldset">
            <FormLabel component="legend">Condition Type</FormLabel>
            <RadioGroup
              value={conditionType}
              onChange={(e) => setConditionType(e.target.value as 'single_user' | 'aggregate')}
            >
              <FormControlLabel
                value="single_user"
                control={<Radio />}
                label="Single User - Condition on one specific person"
              />
              <FormControlLabel
                value="aggregate"
                control={<Radio />}
                label="Aggregate - Condition on combined actions of all others"
              />
            </RadioGroup>
          </FormControl>

          {conditionType === 'single_user' && (
            <FormControl fullWidth>
              <InputLabel>Target User</InputLabel>
              <Select
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                label="Target User"
              >
                {members.map((member) => (
                  <MenuItem key={member.userId} value={member.userId}>
                    {member.username} ({member.email})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Action"
              value={conditionAction}
              onChange={(e) => setConditionAction(e.target.value)}
              placeholder="e.g., work, contribute, donate"
              fullWidth
              required
            />
            <TextField
              label="Minimum Amount"
              type="number"
              value={conditionAmount}
              onChange={(e) => setConditionAmount(e.target.value)}
              inputProps={{ min: 0, step: 0.1 }}
              sx={{ width: '200px' }}
              required
            />
            <TextField
              label="Unit"
              value={conditionUnit}
              onChange={(e) => setConditionUnit(e.target.value)}
              placeholder="e.g., hours, dollars"
              sx={{ width: '200px' }}
              required
            />
          </Box>

          <Divider />

          <Typography variant="h6" sx={{ mt: 1 }}>Promise</Typography>
          <Typography variant="body2" color="text.secondary">
            What will you do if the condition is met?
          </Typography>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              label="Action"
              value={promiseAction}
              onChange={(e) => setPromiseAction(e.target.value)}
              placeholder="e.g., work, contribute, donate"
              fullWidth
              required
            />
            <TextField
              label="Minimum Amount"
              type="number"
              value={promiseAmount}
              onChange={(e) => setPromiseAmount(e.target.value)}
              inputProps={{ min: 0, step: 0.1 }}
              sx={{ width: '200px' }}
              required
            />
            <TextField
              label="Unit"
              value={promiseUnit}
              onChange={(e) => setPromiseUnit(e.target.value)}
              placeholder="e.g., hours, dollars"
              sx={{ width: '200px' }}
              required
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Creating...' : 'Create Commitment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
