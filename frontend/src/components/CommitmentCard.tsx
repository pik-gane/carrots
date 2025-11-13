import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Edit, Delete, CheckCircle, Cancel } from '@mui/icons-material';
import { Commitment, GroupMember } from '../types';
import { ProportionalCommitmentGraph } from './ProportionalCommitmentGraph';

interface CommitmentCardProps {
  commitment: Commitment;
  currentUserId: string;
  groupMembers?: GroupMember[];
  onEdit?: (commitment: Commitment) => void;
  onRevoke?: (commitment: Commitment) => void;
}

export function CommitmentCard({ commitment, currentUserId, groupMembers, onEdit, onRevoke }: CommitmentCardProps) {
  const isCreator = commitment.creatorId === currentUserId;
  const isActive = commitment.status === 'active';

  const formatConditions = () => {
    const { conditions } = commitment.parsedCommitment;
    
    if (!conditions || conditions.length === 0) {
      return 'No conditions';
    }
    
    return conditions.map((condition, idx) => {
      let conditionText = '';
      
      if (condition.targetUserId) {
        // Single-user condition
        let targetUsername = 'Unknown user';
        if (groupMembers) {
          const targetMember = groupMembers.find(m => m.userId === condition.targetUserId);
          targetUsername = targetMember?.username || condition.targetUserId;
        }
        conditionText = `${targetUsername} does at least ${condition.minAmount} ${condition.unit} of ${condition.action}`;
      } else {
        // Aggregate condition
        conditionText = `All users combined do at least ${condition.minAmount} ${condition.unit} of ${condition.action}`;
      }
      
      return (
        <Typography key={idx} variant="body2" sx={{ ml: idx > 0 ? 2 : 0 }}>
          {idx > 0 && <strong>AND </strong>}
          {conditionText}
        </Typography>
      );
    });
  };

  const formatPromises = () => {
    const { promises } = commitment.parsedCommitment;
    
    if (!promises || promises.length === 0) {
      return 'No promises';
    }
    
    return promises.map((promise, idx) => {
      let promiseText = '';
      
      // Determine reference user
      let refUser = 'all users combined';
      if (promise.referenceUserId) {
        if (groupMembers) {
          const refMember = groupMembers.find(m => m.userId === promise.referenceUserId);
          refUser = refMember?.username || promise.referenceUserId;
        } else {
          refUser = promise.referenceUserId;
        }
      }
      
      // Build promise text based on pattern
      if (promise.proportionalAmount > 0 && promise.referenceAction) {
        // Has proportional component
        if (promise.baseAmount > 0 && promise.thresholdAmount !== undefined && promise.thresholdAmount > 0) {
          // Pattern: "2 dB of meowing reduction plus another 0.5 dB for each dB of AC/DC volume reduction by Anna that exceeds 2 dB, but at most at 3.5 dB in total"
          promiseText = `${promise.baseAmount} ${promise.unit} of ${promise.action} plus another ${promise.proportionalAmount} ${promise.unit} for each ${promise.unit} of ${promise.referenceAction} by ${refUser} that exceeds ${promise.thresholdAmount} ${promise.unit}`;
        } else if (promise.baseAmount > 0) {
          // Base + proportional without threshold
          promiseText = `${promise.baseAmount} ${promise.unit} of ${promise.action} plus another ${promise.proportionalAmount} ${promise.unit} for each ${promise.unit} of ${promise.referenceAction} by ${refUser}`;
        } else {
          // Pattern: "0.5 dB of meowing reduction for each dB of AC/DC volume reduction by Anna, but at most at 3.5 dB in total"
          promiseText = `${promise.proportionalAmount} ${promise.unit} of ${promise.action} for each ${promise.unit} of ${promise.referenceAction} by ${refUser}`;
        }
        
        // Add max amount cap if present
        if (promise.maxAmount !== undefined) {
          promiseText += `, but at most ${promise.maxAmount} ${promise.unit} in total`;
        }
      } else if (promise.baseAmount > 0) {
        // Only base amount, no proportional component
        promiseText = `${promise.baseAmount} ${promise.unit} of ${promise.action}`;
      }
      
      return (
        <Typography key={idx} variant="body2" color="primary.main" sx={{ ml: idx > 0 ? 2 : 0 }}>
          {idx > 0 && <strong>PLUS </strong>}
          {promiseText}
        </Typography>
      );
    });
  };

  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 2,
        opacity: isActive ? 1 : 0.6,
        borderColor: isActive ? 'primary.main' : 'grey.400',
        borderWidth: 2,
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="caption" color="text.secondary">
                by {commitment.creator.username}
              </Typography>
              <Chip 
                label={isActive ? 'Active' : 'Revoked'} 
                color={isActive ? 'success' : 'default'}
                size="small"
                icon={isActive ? <CheckCircle /> : <Cancel />}
              />
              {commitment.conditionType === 'aggregate' && (
                <Chip label="Aggregate" size="small" variant="outlined" />
              )}
              {commitment.conditionType === 'unconditional' && (
                <Chip label="Unconditional" size="small" variant="outlined" color="success" />
              )}
            </Box>
          </Box>
          {isCreator && isActive && (
            <Box>
              {onEdit && (
                <Tooltip title="Edit commitment">
                  <IconButton size="small" onClick={() => onEdit(commitment)} sx={{ mr: 0.5 }}>
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {onRevoke && (
                <Tooltip title="Revoke commitment">
                  <IconButton size="small" color="error" onClick={() => onRevoke(commitment)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          )}
        </Box>

        {commitment.naturalLanguageText && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1, borderLeft: 4, borderColor: 'primary.main' }}>
            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
              "{commitment.naturalLanguageText}"
            </Typography>
          </Box>
        )}

        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Conditions (all must be met):</strong>
          </Typography>
          <Box sx={{ ml: 1 }}>
            {formatConditions()}
          </Box>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Promises (I will do):</strong>
          </Typography>
          <Box sx={{ ml: 1 }}>
            {formatPromises()}
          </Box>
          {/* Show graphs for proportional promises */}
          {commitment.parsedCommitment.promises && commitment.parsedCommitment.promises.map((promise, idx) => (
            promise.proportionalAmount > 0 && promise.referenceAction ? (
              <ProportionalCommitmentGraph key={idx} promise={promise} groupMembers={groupMembers} />
            ) : null
          ))}
        </Box>

        {commitment.warnings && commitment.warnings.length > 0 && (
          <Box sx={{ mt: 2, p: 1, bgcolor: 'warning.light', borderRadius: 1 }}>
            <Typography variant="caption" color="warning.dark">
              <strong>⚠️ Warnings:</strong>
            </Typography>
            {commitment.warnings.map((warning, idx) => (
              <Typography key={idx} variant="caption" display="block" color="warning.dark">
                • {warning}
              </Typography>
            ))}
          </Box>
        )}

        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Created {new Date(commitment.createdAt).toLocaleDateString()}
          </Typography>
          {!isActive && commitment.revokedAt && (
            <Typography variant="caption" color="error">
              Revoked {new Date(commitment.revokedAt).toLocaleDateString()}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
