import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { initializeWebSocket } from './services/websocket';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import groupRoutes from './routes/groups';
import commitmentRoutes from './routes/commitments';
import liabilityRoutes from './routes/liabilities';
import messageRoutes from './routes/messages';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const httpServer = createServer(app);

// Initialize WebSocket
initializeWebSocket(httpServer);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.get('/api', (_req, res) => {
  res.json({
    message: 'Carrots API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      groups: '/api/groups',
      commitments: '/api/commitments',
      liabilities: '/api/liabilities',
      messages: '/api/messages',
    },
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/commitments', commitmentRoutes);
app.use('/api', liabilityRoutes);
app.use('/api/messages', messageRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
httpServer.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
  logger.info(`WebSocket server initialized`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
