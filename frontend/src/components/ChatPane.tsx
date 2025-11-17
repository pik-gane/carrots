import { Box, Paper, Typography, Chip, Button, Link as MuiLink } from '@mui/material';
import { Info } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { Message } from '../types';
import { DebugAccordion } from './DebugAccordion';

interface ChatPaneProps {
  messages: Message[];
  currentUserId: string | undefined;
  debugMode: boolean;
  onReply?: (message: Message) => void;
  formatTimestamp: (timestamp: string) => string;
}

export function ChatPane({
  messages,
  currentUserId,
  debugMode,
  onReply,
  formatTimestamp,
}: ChatPaneProps) {
  const renderMessage = (message: Message) => {
    const isOwnMessage = message.userId === currentUserId;
    const isSystemMessage = message.userId === null;
    const isPrivate = message.isPrivate;

    // Handle private clarification requests
    if (isPrivate && message.type === 'clarification_request') {
      return (
        <Box key={message.id}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-start' }}>
            <Paper
              elevation={1}
              sx={{
                p: 2,
                maxWidth: '85%',
                bgcolor: 'warning.light',
                borderLeft: '4px solid',
                borderLeftColor: 'warning.main',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="caption" fontWeight="bold">
                  System (Private)
                </Typography>
                <Chip label="Clarification Needed" size="small" color="warning" />
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>
              {onReply && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => onReply(message)}
                  sx={{ mt: 1 }}
                >
                  Reply Privately
                </Button>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                {formatTimestamp(message.createdAt)}
              </Typography>
            </Paper>
          </Box>
          {debugMode && message.metadata?.debug && (
            <DebugAccordion debug={message.metadata.debug} />
          )}
        </Box>
      );
    }

    // Handle system messages
    if (isSystemMessage) {
      return (
        <Box key={message.id}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                maxWidth: '90%',
                bgcolor:
                  message.type === 'system_commitment'
                    ? 'primary.light'
                    : message.type === 'system_liability'
                    ? 'info.light'
                    : 'grey.200',
                color: 'text.primary',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Info fontSize="small" />
                <Typography variant="caption" fontWeight="bold">
                  System
                </Typography>
                {message.type === 'system_commitment' && (
                  <Chip label="Commitment" size="small" color="primary" />
                )}
                {message.type === 'system_liability' && (
                  <Chip label="Liability Update" size="small" color="info" />
                )}
              </Box>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {message.content}
              </Typography>
              {message.type === 'system_commitment' && message.metadata?.link && (
                <Box sx={{ mt: 1 }}>
                  <MuiLink
                    component={RouterLink}
                    to={message.metadata.link as string}
                    sx={{ fontSize: '0.875rem', fontWeight: 500 }}
                  >
                    View in Commitment Panel →
                  </MuiLink>
                </Box>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 1, display: 'block' }}
              >
                {formatTimestamp(message.createdAt)}
              </Typography>
            </Paper>
          </Box>
          {debugMode && message.metadata?.debug && (
            <DebugAccordion debug={message.metadata.debug} />
          )}
        </Box>
      );
    }

    // Handle private clarification responses
    if (isPrivate && message.type === 'clarification_response') {
      return (
        <Box key={message.id} sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Paper
            elevation={1}
            sx={{
              p: 2,
              maxWidth: '85%',
              bgcolor: 'warning.light',
              borderLeft: '4px solid',
              borderLeftColor: 'warning.main',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="caption" fontWeight="bold">
                {message.user?.username} (Private Reply)
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {formatTimestamp(message.createdAt)}
            </Typography>
          </Paper>
        </Box>
      );
    }

    // Other private messages
    if (isPrivate) {
      return (
        <Box
          key={message.id}
          sx={{ mb: 2, display: 'flex', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start' }}
        >
          <Paper
            elevation={1}
            sx={{
              p: 2,
              maxWidth: '85%',
              bgcolor: 'warning.light',
              borderLeft: '4px solid',
              borderLeftColor: 'warning.main',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="caption" fontWeight="bold">
                {message.user?.username || 'System'} (Private)
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {message.content}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {formatTimestamp(message.createdAt)}
            </Typography>
          </Paper>
        </Box>
      );
    }

    // Regular user message
    return (
      <Box
        key={message.id}
        sx={{ mb: 2, display: 'flex', justifyContent: isOwnMessage ? 'flex-end' : 'flex-start' }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: '85%',
            bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
            color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
          }}
        >
          {!isOwnMessage && (
            <Typography variant="caption" fontWeight="bold" display="block" sx={{ mb: 0.5 }}>
              {message.user?.username}
            </Typography>
          )}
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              mt: 1,
              display: 'block',
              opacity: 0.7,
              color: isOwnMessage ? 'inherit' : 'text.secondary',
            }}
          >
            {formatTimestamp(message.createdAt)}
          </Typography>
        </Paper>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', overflowY: 'auto', p: 2 }}>
      {messages.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" height="100%">
          <Typography color="text.secondary">No messages yet</Typography>
        </Box>
      ) : (
        messages.map(renderMessage)
      )}
    </Box>
  );
}
