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

  const formatCondition = () => {
    const { condition } = commitment.parsedCommitment;
    if (condition.type === 'unconditional') {
      return 'Unconditionally';
    } else if (condition.type === 'single_user') {
      // Try to get username from condition, otherwise look it up from groupMembers
      let targetUsername = condition.targetUsername;
      if (!targetUsername && condition.targetUserId && groupMembers) {
        const targetMember = groupMembers.find(m => m.userId === condition.targetUserId);
        targetUsername = targetMember?.username;
      }
      
      if (targetUsername) {
        return `If ${targetUsername} does at least ${condition.minAmount} ${condition.unit} of ${condition.action}`;
      }
      // Fallback if we still can't find the username
      return `If user does at least ${condition.minAmount} ${condition.unit} of ${condition.action}`;
    } else if (condition.type === 'aggregate') {
      return `If others do at least ${condition.minAmount} ${condition.unit} of ${condition.action} combined`;
    }
    return 'Unknown condition';
  };

  const formatPromise = () => {
    const { promise } = commitment.parsedCommitment;
    return `I will do at least ${promise.minAmount} ${promise.unit} of ${promise.action}`;
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
            <strong>Condition:</strong>
          </Typography>
          <Typography variant="body1">
            {formatCondition()}
          </Typography>
        </Box>

        <Box sx={{ mb: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            <strong>Promise:</strong>
          </Typography>
          <Typography variant="body1" color="primary.main">
            {formatPromise()}
          </Typography>
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
