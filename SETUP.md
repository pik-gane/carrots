# Environment Setup Guide

This guide helps you configure the Carrots application for local development.

## Quick Start

### Option 1: Automatic Setup (Recommended)

Run the setup script from the project root:

```bash
./setup-env.sh
```

The script will:
1. Prompt you to choose between Docker credentials or custom credentials
2. Optionally configure JWT secret and OpenAI API key
3. Create a `backend/.env` file with your configuration
4. Provide next steps for starting the application

### Option 2: Manual Setup

1. Copy the example environment file:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edit `backend/.env` and update the credentials:
   ```env
   DATABASE_URL="postgresql://carrots:carrots_password@localhost:5432/carrots_dev"
   JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
   OPENAI_API_KEY="sk-your-openai-api-key-here"
   PORT=3001
   NODE_ENV=development
   CORS_ORIGIN="http://localhost:3000"
   ```

## Database Credentials

### Using Docker Compose (Default)

The `docker-compose.yml` file configures PostgreSQL with these credentials:

- **User**: `carrots`
- **Password**: `carrots_password`
- **Database**: `carrots_dev`
- **Port**: `5432` (exposed to host)

When running the backend **outside Docker** (e.g., for seeding or local development), use these credentials in your `.env` file:

```env
DATABASE_URL="postgresql://carrots:carrots_password@localhost:5432/carrots_dev"
```

### Using Custom Credentials

If you're running PostgreSQL separately or want different credentials:

1. Update your PostgreSQL server configuration
2. Run the setup script and choose option 2 (custom credentials)
3. Or manually update the `DATABASE_URL` in `backend/.env`

## Running the Application

### With Docker Compose

1. Start all services:
   ```bash
   docker compose up -d
   ```

2. The application will be available at:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

### Without Docker (Local Development)

1. Ensure PostgreSQL is running with the configured credentials

2. Install dependencies:
   ```bash
   cd backend
   npm install
   cd ../frontend
   npm install
   ```

3. Run database migrations:
   ```bash
   cd backend
   npm run prisma:migrate:dev
   ```

4. (Optional) Seed demo data:
   ```bash
   npm run prisma:demo-seed
   ```

5. Start the backend:
   ```bash
   npm run dev
   ```

6. In a new terminal, start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

## Demo Data

The demo seed script creates a household example with 4 users and 6 interconnected commitments.

### Running the Demo Seed

```bash
cd backend
npm run prisma:demo-seed
```

### Demo Login Credentials

All demo users have the password: `demo123`

- **anna@demo.com** - Anna (creates conditional commitments)
- **bella@demo.com** - Bella (dishes for rent commitment)
- **celia@demo.com** - Celia (rent for trash commitment)
- **cat@demo.com** - The Cat (unconditional rent payment)

See `backend/prisma/DEMO_SEED_README.md` for details about the demo scenario.

## Troubleshooting

### "Authentication failed" Error

If you see:
```
Authentication failed against database server at `localhost`
```

**Solution:**
1. Verify Docker Compose is running: `docker compose ps`
2. Check that PostgreSQL port 5432 is exposed: `docker compose logs postgres`
3. Verify your `backend/.env` file has the correct credentials
4. Re-run the setup script: `./setup-env.sh`

### "Database does not exist" Error

**Solution:**
```bash
# If using Docker
docker compose up -d postgres

# If using local PostgreSQL
createdb carrots_dev

# Then run migrations
cd backend
npm run prisma:migrate:dev
```

### Port Already in Use

If ports 3000, 3001, or 5432 are already in use:

1. Stop conflicting services
2. Or update the ports in `docker-compose.yml` and `backend/.env`

## Environment Variables Reference

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://carrots:carrots_password@localhost:5432/carrots_dev` |
| `JWT_SECRET` | Secret key for JWT token generation | `your-super-secret-jwt-key-change-this-in-production` |
| `OPENAI_API_KEY` | OpenAI API key for NLP features (optional) | `sk-your-openai-api-key-here` |
| `PORT` | Backend server port | `3001` |
| `NODE_ENV` | Node environment | `development` |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:3000` |

## Security Notes

- ⚠️ The default credentials are **for development only**
- 🔒 Never commit `.env` files to version control
- 🔐 Use strong, unique credentials in production
- 🔑 Rotate JWT secrets regularly in production
