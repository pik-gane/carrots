import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  CircularProgress,
  Button,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import { Liability } from '../types';

interface LiabilityDisplayProps {
  liabilities: Liability[];
  calculatedAt?: string;
  loading?: boolean;
  onRefresh?: () => void;
}

export function LiabilityDisplay({ liabilities, calculatedAt, loading = false, onRefresh }: LiabilityDisplayProps) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!liabilities || liabilities.length === 0) {
    return (
      <Alert severity="info">
        No liabilities calculated yet. Liabilities are calculated based on active commitments.
        {onRefresh && (
          <Button onClick={onRefresh} size="small" sx={{ ml: 2 }}>
            Calculate Now
          </Button>
        )}
      </Alert>
    );
  }

  // Group liabilities by user
  const liabilitiesByUser = liabilities.reduce((acc, liability) => {
    if (!acc[liability.userId]) {
      acc[liability.userId] = {
        username: liability.username,
        items: [],
      };
    }
    acc[liability.userId].items.push(liability);
    return acc;
  }, {} as Record<string, { username: string; items: Liability[] }>);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Calculated Liabilities</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {calculatedAt && (
            <Typography variant="caption" color="text.secondary">
              Last calculated: {new Date(calculatedAt).toLocaleString()}
            </Typography>
          )}
          {onRefresh && (
            <Button
              startIcon={<Refresh />}
              onClick={onRefresh}
              size="small"
              variant="outlined"
              disabled={loading}
            >
              Refresh
            </Button>
          )}
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>User</strong></TableCell>
              <TableCell><strong>Action</strong></TableCell>
              <TableCell align="right"><strong>Amount</strong></TableCell>
              <TableCell><strong>Unit</strong></TableCell>
              <TableCell align="center"><strong>Effective Commitments</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {Object.entries(liabilitiesByUser).map(([, { username, items }]) => (
              items.map((liability, idx) => (
                <TableRow key={liability.id} hover>
                  {idx === 0 && (
                    <TableCell rowSpan={items.length}>
                      <Typography variant="body2" fontWeight="bold">
                        {username}
                      </Typography>
                    </TableCell>
                  )}
                  <TableCell>{liability.action}</TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      {liability.amount}
                    </Typography>
                  </TableCell>
                  <TableCell>{liability.unit}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={liability.effectiveCommitmentIds.length} 
                      size="small" 
                      color="primary"
                      variant="outlined"
                    />
                  </TableCell>
                </TableRow>
              ))
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        Liabilities represent the minimum actions each user must take based on all active commitments.
      </Typography>
    </Box>
  );
}
