import request from 'supertest';
import express, { Application } from 'express';
import { PrismaClient } from '@prisma/client';
import authRoutes from './auth';
import { generateAccessToken, generateRefreshToken } from '../utils/auth/jwt';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

// Mock password utilities
jest.mock('../utils/auth/password', () => ({
  hashPassword: jest.fn((password: string) => Promise.resolve(`hashed_${password}`)),
  comparePassword: jest.fn((password: string, hash: string) => {
    return Promise.resolve(hash === `hashed_${password}`);
  }),
}));

describe('Auth Routes', () => {
  let app: Application;
  let prisma: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);

    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123',
      };

      prisma.user.findFirst.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-123',
        username: newUser.username,
        email: newUser.email,
        createdAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user).toMatchObject({
        id: 'user-123',
        username: newUser.username,
        email: newUser.email,
      });
    });

    it('should reject registration with existing email', async () => {
      const newUser = {
        username: 'testuser',
        email: 'existing@example.com',
        password: 'Password123',
      };

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-456',
        email: newUser.email,
        username: 'someuser',
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(409);

      expect(response.body).toHaveProperty('error', 'User already exists');
      expect(response.body).toHaveProperty('message', 'Email already registered');
    });

    it('should reject registration with invalid email', async () => {
      const newUser = {
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password123',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });

    it('should reject registration with weak password', async () => {
      const newUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak',
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(newUser)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user with valid credentials', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'Password123',
      };

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        email: credentials.email,
        passwordHash: 'hashed_Password123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject login with invalid email', async () => {
      const credentials = {
        email: 'nonexistent@example.com',
        password: 'Password123',
      };

      prisma.user.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication failed');
    });

    it('should reject login with invalid password', async () => {
      const credentials = {
        email: 'test@example.com',
        password: 'WrongPassword',
      };

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        email: credentials.email,
        passwordHash: 'hashed_Password123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication failed');
    });

    it('should login user with username', async () => {
      const credentials = {
        email: 'testuser',
        password: 'Password123',
      };

      prisma.user.findFirst.mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        email: 'testuser@example.com',
        passwordHash: 'hashed_Password123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send(credentials)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('username', 'testuser');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh token with valid refresh token', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const refreshToken = generateRefreshToken(userId, email);

      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        username: 'testuser',
        email,
      });

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Token refreshed successfully');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject refresh with access token instead of refresh token', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const accessToken = generateAccessToken(userId, email);

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: accessToken })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Invalid token type');
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Token refresh failed');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully with valid token', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const accessToken = generateAccessToken(userId, email);

      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logout successful');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should get current user info with valid token', async () => {
      const userId = 'user-123';
      const email = 'test@example.com';
      const accessToken = generateAccessToken(userId, email);

      prisma.user.findUnique.mockResolvedValue({
        id: userId,
        username: 'testuser',
        email,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        id: userId,
        username: 'testuser',
        email,
      });
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication required');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error', 'Authentication failed');
    });
  });
});
