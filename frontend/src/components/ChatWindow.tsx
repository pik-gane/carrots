import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  CircularProgress,
  Alert,
  Badge,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Send, BugReport } from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import { Message } from '../types';
import { messagesApi } from '../api/messages';
import { useAuth } from '../hooks/useAuth';
import { ChatPane } from './ChatPane';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ChatWindowProps {
  groupId: string;
  groupName: string;
}

export function ChatWindow({ groupId, groupName }: ChatWindowProps) {
  const { user } = useAuth();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md')); // >= 768px
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [debugMode, setDebugMode] = useState(() => {
    // Load debug mode from localStorage
    const saved = localStorage.getItem('chatDebugMode');
    return saved === 'true';
  });
  const [activeTab, setActiveTab] = useState(0); // 0 = Public, 1 = Private
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  // Save debug mode to localStorage
  useEffect(() => {
    localStorage.setItem('chatDebugMode', debugMode.toString());
  }, [debugMode]);

  // Separate messages into public and private
  const publicMessages = messages.filter(
    (m) =>
      !m.isPrivate &&
      (m.type === 'user_message' || m.type === 'system_commitment' || m.type === 'system_liability')
  );

  const privateMessages = messages.filter(
    (m) =>
      m.isPrivate &&
      (m.type === 'clarification_request' ||
        m.type === 'clarification_response' ||
        (m.targetUserId === user?.id || m.userId === user?.id))
  );

  // Count unread private messages (simplified - just show count of private messages)
  const unreadPrivateCount = privateMessages.length;

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
      await messagesApi.send(groupId, messageText.trim(), replyingTo?.id);
      setMessageText('');
      setReplyingTo(null); // Clear reply context
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

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    // Switch to private tab on mobile
    if (!isDesktop) {
      setActiveTab(1);
    }
    // Focus the input field
    const input = document.querySelector('textarea');
    if (input) input.focus();
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
      {/* Header - Fixed at top */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1,
          px: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle1" fontWeight="600">{groupName}</Typography>
        <FormControlLabel
          control={
            <Switch
              checked={debugMode}
              onChange={(e) => setDebugMode(e.target.checked)}
              size="small"
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <BugReport fontSize="small" />
              <Typography variant="caption">Debug</Typography>
            </Box>
          }
          sx={{ m: 0 }}
        />
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mx: 2, mt: 1, flexShrink: 0 }}>
          {error}
        </Alert>
      )}

      {/* Desktop: Split Panes */}
      {isDesktop ? (
        <Box sx={{ flex: 1, display: 'flex', gap: 2, minHeight: 0, p: 2 }}>
          {/* Public Pane */}
          <Paper
            elevation={0}
            sx={{
              flex: '0 0 60%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'grey.50',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                p: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                flexShrink: 0,
              }}
            >
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>👥</span> Group Chat
              </Typography>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <ChatPane
                messages={publicMessages}
                currentUserId={user?.id}
                debugMode={debugMode}
                formatTimestamp={formatTimestamp}
              />
              <div ref={messagesEndRef} />
            </Box>
          </Paper>

          {/* Private Pane */}
          <Paper
            elevation={0}
            sx={{
              flex: '0 0 40%',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: 'grey.50',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                p: 1,
                borderBottom: '1px solid',
                borderColor: 'divider',
                bgcolor: 'background.paper',
                flexShrink: 0,
              }}
            >
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <span>🔒</span> Private Clarifications
                {unreadPrivateCount > 0 && (
                  <Badge badgeContent={unreadPrivateCount} color="warning" sx={{ ml: 1 }} />
                )}
              </Typography>
            </Box>
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              <ChatPane
                messages={privateMessages}
                currentUserId={user?.id}
                debugMode={debugMode}
                onReply={handleReply}
                formatTimestamp={formatTimestamp}
              />
            </Box>
          </Paper>
        </Box>
      ) : (
        /* Mobile: Tabs */
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, p: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, newValue) => setActiveTab(newValue)}
            sx={{ borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}
          >
            <Tab label="👥 Public" />
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>🔒 Private</span>
                  {unreadPrivateCount > 0 && (
                    <Badge badgeContent={unreadPrivateCount} color="warning" />
                  )}
                </Box>
              }
            />
          </Tabs>
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              bgcolor: 'grey.50',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
              {activeTab === 0 ? (
                <ChatPane
                  messages={publicMessages}
                  currentUserId={user?.id}
                  debugMode={debugMode}
                  formatTimestamp={formatTimestamp}
                />
              ) : (
                <ChatPane
                  messages={privateMessages}
                  currentUserId={user?.id}
                  debugMode={debugMode}
                  onReply={handleReply}
                  formatTimestamp={formatTimestamp}
                />
              )}
              <div ref={messagesEndRef} />
            </Box>
          </Paper>
        </Box>
      )}

      {/* Message Input - Fixed at bottom */}
      <Box component="form" onSubmit={handleSendMessage} sx={{ display: 'flex', flexDirection: 'column', gap: 1, p: 2, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        {replyingTo ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1, 
            p: 1, 
            bgcolor: 'warning.light', 
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'warning.main',
          }}>
            <Typography variant="caption" sx={{ flex: 1 }}>
              🔒 Replying privately to clarification request
            </Typography>
            <Button 
              size="small" 
              onClick={() => setReplyingTo(null)}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              Cancel
            </Button>
          </Box>
        ) : (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <span style={{ fontSize: '1.2em' }}>👥</span>
            Sending to group (visible to all members)
          </Typography>
        )}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder={replyingTo ? "Type your private reply..." : "Type a message... (e.g., 'If Alice does 5 hours of work, I'll do 3 hours')"}
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
        {!replyingTo && (
          <Typography variant="caption" color="text.secondary">
            💡 Tip: You can express commitments naturally in chat. The AI will detect them and create structured commitments automatically.
          </Typography>
        )}
      </Box>
    </Box>
  );
}
