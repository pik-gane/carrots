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
  Link as MuiLink,
} from '@mui/material';
import { Send, Info } from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import { Link as RouterLink } from 'react-router-dom';
import { Message } from '../types';
import { messagesApi } from '../api/messages';
import { useAuth } from '../hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
  const socketRef = useRef<Socket | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async (isInitialLoad = false) => {
    try {
      // Only show loading indicator on initial load
      if (isInitialLoad) {
        setLoading(true);
      }
      setError(null);
      const data = await messagesApi.list(groupId, 100);
      setMessages(data);
      
      if (isInitialLoad) {
        scrollToBottom();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load messages');
    } finally {
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  }, [groupId]);

  // Set up WebSocket connection
  useEffect(() => {
    // Load initial messages
    loadMessages(true);

    // Connect to WebSocket
    const socket = io(API_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      // Join the group room
      socket.emit('join-group', groupId);
    });

    socket.on('new-message', (newMessage: Message) => {
      // Check if this message is for the current user (for private messages)
      const isForMe = !newMessage.isPrivate || 
                      newMessage.targetUserId === user?.id || 
                      newMessage.userId === user?.id;
      
      if (isForMe) {
        setMessages((prev) => {
          // Avoid duplicates
          const exists = prev.some(m => m.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
        // Auto-scroll when new message arrives
        setTimeout(scrollToBottom, 100);
      }
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
    });

    return () => {
      if (socket) {
        socket.emit('leave-group', groupId);
        socket.disconnect();
      }
    };
  }, [groupId, loadMessages, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    try {
      setSending(true);
      // Send message - it will be echoed back via WebSocket
      await messagesApi.send(groupId, messageText.trim());
      setMessageText('');
      // System messages (commitment, liability) will arrive via WebSocket
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
      <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span style={{ fontSize: '1.2em' }}>👥</span>
            Sending to group (visible to all members)
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
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
      </Box>

      <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
        💡 Tip: You can express commitments naturally in chat. The AI will detect them and create structured commitments automatically.
      </Typography>
    </Box>
  );
}
