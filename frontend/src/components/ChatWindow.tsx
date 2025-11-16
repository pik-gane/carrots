import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { Send, Info } from '@mui/icons-material';
import { Message } from '../types';
import { messagesApi } from '../api/messages';
import { useAuth } from '../hooks/useAuth';

interface ChatWindowProps {
  groupId: string;
  groupName: string;
}

export function ChatWindow({ groupId }: ChatWindowProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await messagesApi.list(groupId, 100);
      setMessages(data);
      scrollToBottom();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    loadMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [groupId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    try {
      setSending(true);
      const newMessage = await messagesApi.send(groupId, messageText.trim());
      setMessages((prev) => [...prev, newMessage]);
      setMessageText('');
      scrollToBottom();
      // Reload to get any system messages
      setTimeout(loadMessages, 1000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message: Message) => {
    const isOwnMessage = message.userId === user?.id;
    const isSystemMessage = message.userId === null;
    const isPrivate = message.isPrivate;

    // Different rendering for different message types
    if (isSystemMessage) {
      return (
        <Box
          key={message.id}
          sx={{
            mb: 2,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Paper
            elevation={0}
            sx={{
              p: 2,
              maxWidth: '80%',
              bgcolor: message.type === 'system_commitment' ? 'primary.light' : 
                       message.type === 'system_liability' ? 'info.light' : 
                       'grey.200',
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
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {formatTimestamp(message.createdAt)}
            </Typography>
          </Paper>
        </Box>
      );
    }

    if (isPrivate) {
      return (
        <Box
          key={message.id}
          sx={{
            mb: 2,
            display: 'flex',
            justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
          }}
        >
          <Paper
            elevation={1}
            sx={{
              p: 2,
              maxWidth: '70%',
              bgcolor: 'warning.light',
              borderLeft: '4px solid',
              borderLeftColor: 'warning.main',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="caption" fontWeight="bold">
                {message.user?.username || 'System'} (Private)
              </Typography>
              {message.type === 'clarification_request' && (
                <Chip label="Clarification Needed" size="small" color="warning" />
              )}
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
        sx={{
          mb: 2,
          display: 'flex',
          justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
        }}
      >
        <Paper
          elevation={1}
          sx={{
            p: 2,
            maxWidth: '70%',
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

  if (loading && messages.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Messages Area */}
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          p: 2,
          overflowY: 'auto',
          bgcolor: 'grey.50',
          minHeight: '400px',
          maxHeight: '600px',
          mb: 2,
        }}
      >
        {messages.length === 0 ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <Typography color="text.secondary">
              No messages yet. Start the conversation!
            </Typography>
          </Box>
        ) : (
          <>
            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </>
        )}
      </Paper>

      {/* Message Input */}
      <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Type a message... (e.g., 'If Alice does 5 hours of work, I'll do 3 hours')"
          disabled={sending}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        <Button
          variant="contained"
          type="submit"
          disabled={!messageText.trim() || sending}
          sx={{ minWidth: '100px' }}
        >
          {sending ? <CircularProgress size={24} /> : <Send />}
        </Button>
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        💡 Tip: You can express commitments naturally in chat. The AI will detect them and create structured commitments automatically.
      </Typography>
    </Box>
  );
}
