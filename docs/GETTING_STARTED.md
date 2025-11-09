# Getting Started with Carrots Development

This guide will help you set up the Carrots application for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **PostgreSQL** 14 or higher ([Download](https://www.postgresql.org/download/))
- **npm** 9 or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **(Optional) Docker** for containerized development ([Download](https://www.docker.com/))

## Quick Start (Docker - Recommended)

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/pik-gane/carrots.git
cd carrots

# Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit backend/.env and add your OpenAI API key (for NLP features)
# OPENAI_API_KEY=sk-your-key-here

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# Health check: http://localhost:3001/health
```

To stop the services:
```bash
docker-compose down
```

## Manual Setup

If you prefer to run services individually:

### 1. Set Up PostgreSQL Database

```bash
# Create a new database
createdb carrots_dev

# Or using psql
psql -U postgres
CREATE DATABASE carrots_dev;
\q
```

### 2. Set Up Backend

```bash
cd backend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Edit .env file with your configuration:
# - DATABASE_URL: Your PostgreSQL connection string
# - JWT_SECRET: A secure random string
# - OPENAI_API_KEY: Your OpenAI API key (optional for now)

# Generate Prisma client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate:dev

# (Optional) Seed the database with sample data
npm run prisma:seed

# Start the development server
npm run dev
```

The backend should now be running at http://localhost:3001

### 3. Set Up Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Edit .env if needed (default API URL is http://localhost:3001)

# Start the development server
npm start
```

The frontend should now be running at http://localhost:3000

## Verify Installation

1. **Check Backend Health**:
   ```bash
   curl http://localhost:3001/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

2. **Check Frontend**:
   Open http://localhost:3000 in your browser

## Development Workflow

### Running Tests

```bash
# Backend tests
cd backend
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Frontend tests
cd frontend
npm test
```

### Linting and Formatting

```bash
# Backend
cd backend
npm run lint
npm run format

# Frontend
cd frontend
npm run lint
npm run format
```

### Database Migrations

When you modify the Prisma schema:

```bash
cd backend

# Create a new migration
npm run prisma:migrate:dev

# Apply migrations
npm run prisma:migrate

# Reset database (⚠️ Deletes all data!)
npm run prisma:reset
```

### Prisma Studio

To visually explore and edit your database:

```bash
cd backend
npx prisma studio
```

Opens at http://localhost:5555

## Project Structure

```
carrots/
├── backend/                 # Node.js/Express backend
│   ├── prisma/             # Database schema and migrations
│   │   └── schema.prisma   # Database models
│   ├── src/
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Data models (if not using Prisma)
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   │   └── liabilityCalculator.ts  # Core algorithm
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   └── server.ts       # Application entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── types/          # TypeScript type definitions
│   │   ├── utils/          # Utility functions
│   │   ├── App.tsx         # Main App component
│   │   └── index.tsx       # Entry point
│   ├── package.json
│   └── tsconfig.json
├── docs/                   # Documentation
│   └── API.md             # API documentation
├── docker/                 # Docker configurations
├── ARCHITECTURE.md         # Architecture documentation
├── IMPLEMENTATION_STRATEGY.md  # Development roadmap
└── docker-compose.yml      # Docker Compose configuration
```

## Common Tasks

### Adding a New API Endpoint

1. Create a route file in `backend/src/routes/`
2. Implement the route handler
3. Add validation schemas
4. Write tests
5. Update API documentation in `docs/API.md`

### Adding a New Frontend Page

1. Create a component in `frontend/src/pages/`
2. Add the route in `frontend/src/App.tsx`
3. Create any necessary child components
4. Add API service calls if needed
5. Write tests

### Updating the Database Schema

1. Modify `backend/prisma/schema.prisma`
2. Run `npm run prisma:migrate:dev`
3. Update TypeScript types if needed
4. Update seed data if applicable

## Troubleshooting

### Port Already in Use

If you see an error about ports already being in use:

```bash
# Find and kill the process using the port
# On macOS/Linux:
lsof -ti:3001 | xargs kill -9

# On Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   pg_isready
   ```

2. Check your DATABASE_URL in `.env`

3. Ensure the database exists:
   ```bash
   psql -l | grep carrots
   ```

### Prisma Client Errors

If you get Prisma client errors, regenerate it:

```bash
cd backend
npm run prisma:generate
```

### Module Not Found Errors

Clear caches and reinstall:

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install

# Frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
```

## Environment Variables Reference

### Backend (.env)

```env
# Database connection
DATABASE_URL="postgresql://user:password@localhost:5432/carrots_dev"

# JWT secret for authentication (generate a secure random string)
JWT_SECRET="your-super-secret-jwt-key"

# OpenAI API key (for natural language processing)
OPENAI_API_KEY="sk-your-openai-api-key"

# Server port
PORT=3001

# Node environment
NODE_ENV=development

# CORS origin (frontend URL)
CORS_ORIGIN="http://localhost:3000"
```

### Frontend (.env)

```env
# Backend API URL
REACT_APP_API_URL=http://localhost:3001
```

## Next Steps

1. Review the [Architecture Documentation](../ARCHITECTURE.md)
2. Read the [Implementation Strategy](../IMPLEMENTATION_STRATEGY.md)
3. Check out the [API Documentation](./API.md)
4. Start implementing features according to the roadmap

## Getting Help

- Check existing documentation in the `/docs` folder
- Review the implementation strategy for guidance
- Check the issue tracker on GitHub

## Contributing

1. Create a feature branch from `main`
2. Make your changes
3. Write/update tests
4. Run linters and tests
5. Submit a pull request

Happy coding! 🥕
