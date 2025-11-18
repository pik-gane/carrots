import { useState } from 'react';
import {
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import { ExpandMore, BugReport } from '@mui/icons-material';

interface DebugInfo {
  prompt: string;
  response: string;
  provider: string;
  timestamp?: string;
}

interface DebugAccordionProps {
  debug: DebugInfo;
}

export function DebugAccordion({ debug }: DebugAccordionProps) {
  const [expanded, setExpanded] = useState(false);

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getProviderColor = (provider: string): 'primary' | 'secondary' | 'success' => {
    switch (provider.toLowerCase()) {
      case 'openai':
        return 'primary';
      case 'anthropic':
        return 'secondary';
      case 'ollama':
        return 'success';
      default:
        return 'primary';
    }
  };

  return (
    <Accordion
      expanded={expanded}
      onChange={() => setExpanded(!expanded)}
      sx={{
        mt: 1,
        bgcolor: 'grey.100',
        '&:before': {
          display: 'none',
        },
      }}
      elevation={0}
    >
      <AccordionSummary
        expandIcon={<ExpandMore />}
        sx={{
          minHeight: 40,
          '& .MuiAccordionSummary-content': {
            margin: '8px 0',
            alignItems: 'center',
            gap: 1,
          },
        }}
      >
        <BugReport fontSize="small" color="action" />
        <Typography variant="caption" fontWeight="bold">
          Debug Info
        </Typography>
        <Chip
          label={debug.provider}
          size="small"
          color={getProviderColor(debug.provider)}
          sx={{ ml: 1, height: 20 }}
        />
        {debug.timestamp && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
            {formatTimestamp(debug.timestamp)}
          </Typography>
        )}
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0 }}>
        <Box>
          <Typography variant="caption" fontWeight="bold" color="text.secondary">
            Prompt Sent to LLM:
          </Typography>
          <Box
            sx={{
              mt: 0.5,
              p: 1.5,
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              maxHeight: 300,
              overflowY: 'auto',
            }}
          >
            <Typography
              variant="body2"
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                margin: 0,
              }}
            >
              {debug.prompt}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Typography variant="caption" fontWeight="bold" color="text.secondary">
            Response from LLM:
          </Typography>
          <Box
            sx={{
              mt: 0.5,
              p: 1.5,
              bgcolor: 'background.paper',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'divider',
              maxHeight: 300,
              overflowY: 'auto',
            }}
          >
            <Typography
              variant="body2"
              component="pre"
              sx={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                margin: 0,
              }}
            >
              {debug.response}
            </Typography>
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}
