import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  Box,
  Alert,
  Divider,
  Typography,
  FormControl,
  IconButton,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { ParsedCommitment, GroupMember, Commitment, CommitmentCondition, CommitmentPromise } from '../types';

interface CreateCommitmentDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (commitment: ParsedCommitment, naturalLanguageText?: string) => void;
  members: GroupMember[];
  loading?: boolean;
  error?: string | null;
  initialCommitment?: Commitment;  // For edit mode
}

export function CreateCommitmentDialog({
  open,
  onClose,
  onSubmit,
  members,
  loading = false,
  error = null,
  initialCommitment,
}: CreateCommitmentDialogProps) {
  const isEditMode = !!initialCommitment;
  const [conditions, setConditions] = useState<CommitmentCondition[]>([]);
  const [promises, setPromises] = useState<CommitmentPromise[]>([]);
  const [naturalLanguageText, setNaturalLanguageText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (initialCommitment) {
        // Edit mode - populate with existing values
        const { parsedCommitment, naturalLanguageText: nlText } = initialCommitment;
        setConditions([...parsedCommitment.conditions]);
        setPromises([...parsedCommitment.promises]);
        setNaturalLanguageText(nlText || '');
      } else {
        // Create mode - start with one empty condition and one empty promise
        setConditions([{
          targetUserId: '',
          action: '',
          minAmount: 0,
          unit: '',
        }]);
        setPromises([{
          action: '',
          baseAmount: 0,
          proportionalAmount: 0,
          unit: '',
        }]);
        setNaturalLanguageText('');
      }
      setValidationError(null);
    }
  }, [open, initialCommitment]);

  const addCondition = () => {
    setConditions([...conditions, {
      targetUserId: '',
      action: '',
      minAmount: 0,
      unit: '',
    }]);
  };

  const removeCondition = (index: number) => {
    if (conditions.length > 1) {
      setConditions(conditions.filter((_, i) => i !== index));
    }
  };

  const updateCondition = (index: number, field: keyof CommitmentCondition, value: any) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };

  const addPromise = () => {
    setPromises([...promises, {
      action: '',
      baseAmount: 0,
      proportionalAmount: 0,
      unit: '',
    }]);
  };

  const removePromise = (index: number) => {
    if (promises.length > 1) {
      setPromises(promises.filter((_, i) => i !== index));
    }
  };

  const updatePromise = (index: number, field: keyof CommitmentPromise, value: any) => {
    const newPromises = [...promises];
    newPromises[index] = { ...newPromises[index], [field]: value };
    setPromises(newPromises);
  };

  const handleSubmit = () => {
    // Validate conditions
    if (conditions.length === 0) {
      setValidationError('At least one condition is required');
      return;
    }

    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      if (!condition.targetUserId) {
        setValidationError(`Condition ${i + 1}: Target user is required`);
        return;
      }
      if (!condition.action.trim()) {
        setValidationError(`Condition ${i + 1}: Action is required`);
        return;
      }
      if (condition.minAmount < 0) {
        setValidationError(`Condition ${i + 1}: Minimum amount must be non-negative`);
        return;
      }
      if (!condition.unit.trim()) {
        setValidationError(`Condition ${i + 1}: Unit is required`);
        return;
      }
    }
    
    // Validate promises
    if (promises.length === 0) {
      setValidationError('At least one promise is required');
      return;
    }

    for (let i = 0; i < promises.length; i++) {
      const promise = promises[i];
      if (!promise.action.trim()) {
        setValidationError(`Promise ${i + 1}: Action is required`);
        return;
      }
      if (promise.baseAmount < 0 || promise.proportionalAmount < 0) {
        setValidationError(`Promise ${i + 1}: Amounts must be non-negative`);
        return;
      }
      if (promise.baseAmount === 0 && promise.proportionalAmount === 0) {
        setValidationError(`Promise ${i + 1}: Either base amount or proportional amount must be greater than 0`);
        return;
      }
      if (promise.proportionalAmount > 0 && !promise.referenceAction) {
        setValidationError(`Promise ${i + 1}: Reference action is required for proportional promises`);
        return;
      }
      if (!promise.unit.trim()) {
        setValidationError(`Promise ${i + 1}: Unit is required`);
        return;
      }
    }

    const parsedCommitment: ParsedCommitment = {
      conditions: conditions.map(c => ({
        targetUserId: c.targetUserId,
        action: c.action.trim(),
        minAmount: c.minAmount,
        unit: c.unit.trim(),
      })),
      promises: promises.map(p => ({
        action: p.action.trim(),
        baseAmount: p.baseAmount,
        proportionalAmount: p.proportionalAmount,
        referenceUserId: p.referenceUserId || undefined,
        referenceAction: p.referenceAction ? p.referenceAction.trim() : undefined,
        thresholdAmount: p.thresholdAmount,
        maxAmount: p.maxAmount,
        unit: p.unit.trim(),
      })),
    };

    onSubmit(parsedCommitment, naturalLanguageText.trim() || undefined);
  };

    onSubmit(parsedCommitment, naturalLanguageText.trim() || undefined);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEditMode ? 'Edit Commitment' : 'Create New Commitment'}</DialogTitle>
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

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="h6">Conditions (all must be met)</Typography>
            <Button startIcon={<Add />} onClick={addCondition} size="small">
              Add Condition
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            What needs to happen for your promise to activate?
          </Typography>

          {conditions.map((condition, index) => (
            <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2">Condition {index + 1}</Typography>
                {conditions.length > 1 && (
                  <IconButton size="small" onClick={() => removeCondition(index)} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <FormControl fullWidth>
                  <InputLabel>Target User</InputLabel>
                  <Select
                    value={condition.targetUserId}
                    onChange={(e) => updateCondition(index, 'targetUserId', e.target.value)}
                    label="Target User"
                  >
                    {members.map((member) => (
                      <MenuItem key={member.userId} value={member.userId}>
                        {member.username} ({member.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Action"
                    value={condition.action}
                    onChange={(e) => updateCondition(index, 'action', e.target.value)}
                    placeholder="e.g., work, contribute, donate"
                    fullWidth
                    required
                  />
                  <TextField
                    label="Minimum Amount"
                    type="number"
                    value={condition.minAmount}
                    onChange={(e) => updateCondition(index, 'minAmount', parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.1 }}
                    sx={{ width: '200px' }}
                    required
                  />
                  <TextField
                    label="Unit"
                    value={condition.unit}
                    onChange={(e) => updateCondition(index, 'unit', e.target.value)}
                    placeholder="e.g., hours, dollars"
                    sx={{ width: '200px' }}
                    required
                  />
                </Box>
              </Box>
            </Box>
          ))}

          <Divider />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
            <Typography variant="h6">Promises (what I will do)</Typography>
            <Button startIcon={<Add />} onClick={addPromise} size="small">
              Add Promise
            </Button>
          </Box>
          <Typography variant="body2" color="text.secondary">
            What will you do if all conditions are met?
          </Typography>

          {promises.map((promise, index) => (
            <Box key={index} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2">Promise {index + 1}</Typography>
                {promises.length > 1 && (
                  <IconButton size="small" onClick={() => removePromise(index)} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
                )}
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Action"
                    value={promise.action}
                    onChange={(e) => updatePromise(index, 'action', e.target.value)}
                    placeholder="e.g., work, contribute, donate"
                    fullWidth
                    required
                  />
                  <TextField
                    label="Unit"
                    value={promise.unit}
                    onChange={(e) => updatePromise(index, 'unit', e.target.value)}
                    placeholder="e.g., hours, dollars"
                    sx={{ width: '200px' }}
                    required
                  />
                </Box>

                <Typography variant="subtitle2">Base Amount</Typography>
                <TextField
                  label="Base Amount"
                  type="number"
                  value={promise.baseAmount}
                  onChange={(e) => updatePromise(index, 'baseAmount', parseFloat(e.target.value) || 0)}
                  inputProps={{ min: 0, step: 0.1 }}
                  fullWidth
                  helperText="Fixed amount you'll contribute regardless of others"
                />

                <Divider />
                <Typography variant="subtitle2">Proportional Matching (Optional)</Typography>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    label="Proportional Amount (multiplier)"
                    type="number"
                    value={promise.proportionalAmount}
                    onChange={(e) => updatePromise(index, 'proportionalAmount', parseFloat(e.target.value) || 0)}
                    inputProps={{ min: 0, step: 0.1 }}
                    fullWidth
                    helperText="Amount per unit of reference action (e.g., 1.5 means match 1.5× each unit)"
                  />
                </Box>

                {promise.proportionalAmount > 0 && (
                  <>
                    <FormControl fullWidth>
                      <InputLabel>Reference User (optional - leave empty for aggregate)</InputLabel>
                      <Select
                        value={promise.referenceUserId || ''}
                        onChange={(e) => updatePromise(index, 'referenceUserId', e.target.value || undefined)}
                        label="Reference User (optional)"
                      >
                        <MenuItem value="">
                          <em>None (aggregate all users)</em>
                        </MenuItem>
                        {members.map((member) => (
                          <MenuItem key={member.userId} value={member.userId}>
                            {member.username} ({member.email})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <TextField
                      label="Reference Action"
                      value={promise.referenceAction || ''}
                      onChange={(e) => updatePromise(index, 'referenceAction', e.target.value)}
                      placeholder="e.g., work, contribute, donate"
                      fullWidth
                      required={promise.proportionalAmount > 0}
                      helperText="The action to monitor for proportional matching"
                    />

                    <TextField
                      label="Threshold Amount (optional)"
                      type="number"
                      value={promise.thresholdAmount || ''}
                      onChange={(e) => updatePromise(index, 'thresholdAmount', parseFloat(e.target.value) || undefined)}
                      inputProps={{ min: 0, step: 0.1 }}
                      fullWidth
                      helperText="Only match amounts above this threshold"
                    />

                    <TextField
                      label="Max Amount (optional)"
                      type="number"
                      value={promise.maxAmount || ''}
                      onChange={(e) => updatePromise(index, 'maxAmount', parseFloat(e.target.value) || undefined)}
                      inputProps={{ min: 0, step: 0.1 }}
                      fullWidth
                      helperText="Cap the proportional contribution at this amount"
                    />
                  </>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Commitment' : 'Create Commitment')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
