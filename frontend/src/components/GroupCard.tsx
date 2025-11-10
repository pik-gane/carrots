import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
} from '@mui/material';
import { Group as GroupIcon, Person } from '@mui/icons-material';
import { Group } from '../types';
import { useNavigate } from 'react-router-dom';

interface GroupCardProps {
  group: Group;
}

export default function GroupCard({ group }: GroupCardProps) {
  const navigate = useNavigate();

  const memberCount = group.memberships?.length || 0;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <GroupIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" component="div">
            {group.name}
          </Typography>
        </Box>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: '3em' }}>
          {group.description || 'No description provided'}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip
            icon={<Person />}
            label={`${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
            size="small"
            variant="outlined"
          />
        </Box>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => navigate(`/groups/${group.id}`)}>
          View Details
        </Button>
      </CardActions>
    </Card>
  );
}
