# Testing the Authentication API

The authentication system is implemented as a REST API on the backend. Since the frontend UI is not yet implemented (Phase 2.3 in the implementation strategy), you can test the API directly using HTTP clients.

## Prerequisites

1. **Start the backend server:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env to configure DATABASE_URL
   npm run prisma:generate
   npm run dev
   ```
   The server will run on http://localhost:3001

2. **Set up the database:**
   ```bash
   # Create PostgreSQL database
   createdb carrots_dev
   
   # Run migrations
   cd backend
   npm run prisma:migrate:dev
   ```

## Testing Methods

### Option 1: Using curl

#### 1. Register a new user
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123"
  }'
```

Expected response:
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid-here",
    "username": "testuser",
    "email": "test@example.com",
    "createdAt": "2025-11-09T..."
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

#### 2. Login
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

#### 3. Get current user info (protected endpoint)
```bash
# Replace YOUR_ACCESS_TOKEN with the token from register/login
curl -X GET http://localhost:3001/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

#### 4. Refresh token
```bash
# Replace YOUR_REFRESH_TOKEN with the refresh token from register/login
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

#### 5. Logout
```bash
curl -X POST http://localhost:3001/api/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Option 2: Using Postman or Insomnia

1. Import the endpoints:
   - **POST** `http://localhost:3001/api/auth/register`
   - **POST** `http://localhost:3001/api/auth/login`
   - **POST** `http://localhost:3001/api/auth/refresh`
   - **POST** `http://localhost:3001/api/auth/logout`
   - **GET** `http://localhost:3001/api/auth/me`

2. Set headers:
   - Content-Type: `application/json`
   - Authorization: `Bearer YOUR_ACCESS_TOKEN` (for protected endpoints)

3. Use the JSON request bodies shown in the curl examples above.

### Option 3: Using the test suite

Run the automated tests:
```bash
cd backend
npm test
```

This runs 18 test cases covering all authentication flows.

## API Endpoints Reference

### POST /api/auth/register
Register a new user.

**Request body:**
```json
{
  "username": "string (3-30 chars, alphanumeric)",
  "email": "string (valid email)",
  "password": "string (8+ chars, must contain uppercase, lowercase, and number)"
}
```

**Response:** 201 Created
```json
{
  "message": "User registered successfully",
  "user": { "id", "username", "email", "createdAt" },
  "accessToken": "string",
  "refreshToken": "string"
}
```

### POST /api/auth/login
Login with email and password.

**Request body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response:** 200 OK (same as register)

### GET /api/auth/me
Get current user info. **Requires authentication.**

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response:** 200 OK
```json
{
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "createdAt": "datetime",
    "updatedAt": "datetime"
  }
}
```

### POST /api/auth/refresh
Refresh access token using refresh token.

**Request body:**
```json
{
  "refreshToken": "string"
}
```

**Response:** 200 OK
```json
{
  "message": "Token refreshed successfully",
  "accessToken": "string",
  "refreshToken": "string"
}
```

### POST /api/auth/logout
Logout (client should remove tokens). **Requires authentication.**

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response:** 200 OK
```json
{
  "message": "Logout successful"
}
```

## Rate Limiting

Authentication endpoints are rate limited:
- **Register/Login/Refresh:** 5 requests per 15 minutes per IP
- **Logout/Me:** 100 requests per 15 minutes per IP

If you exceed the limit, you'll get a 429 Too Many Requests response.

## Security Features

- ✅ Password strength validation (8+ chars, mixed case, numbers)
- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens with expiration (access: 24h, refresh: 7d)
- ✅ Rate limiting on all endpoints
- ✅ Protected routes require valid access token
- ✅ Token type validation (access vs refresh)

## Frontend Implementation

The frontend UI (login/register pages) will be implemented in Phase 2.3 of the implementation strategy. For now, the API is fully functional and can be tested using the methods above.

## Troubleshooting

### "Connection refused" error
Make sure the backend server is running:
```bash
cd backend
npm run dev
```

### Database errors
Ensure PostgreSQL is running and the database exists:
```bash
createdb carrots_dev
cd backend
npm run prisma:migrate:dev
```

### "User already exists" error
The email or username is already registered. Try a different one or use the login endpoint instead.

### 401 Unauthorized
Your access token may be expired or invalid. Login again to get a new token.
