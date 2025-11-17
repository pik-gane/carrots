import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../utils/logger';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.IO server
 */
export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info('Client connected to WebSocket', { socketId: socket.id });

    // Join a group room for receiving messages
    socket.on('join-group', (groupId: string) => {
      socket.join(`group:${groupId}`);
      logger.info('Client joined group room', { socketId: socket.id, groupId });
    });

    // Leave a group room
    socket.on('leave-group', (groupId: string) => {
      socket.leave(`group:${groupId}`);
      logger.info('Client left group room', { socketId: socket.id, groupId });
    });

    socket.on('disconnect', () => {
      logger.info('Client disconnected from WebSocket', { socketId: socket.id });
    });
  });

  return io;
}

/**
 * Get the Socket.IO server instance
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Emit a new message to all clients in a group
 */
export function emitNewMessage(groupId: string, message: any): void {
  if (io) {
    io.to(`group:${groupId}`).emit('new-message', message);
    logger.debug('Emitted new message to group', { groupId, messageId: message.id });
  }
}
