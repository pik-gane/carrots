# Carrots Quick Reference

## Essential Commands

### Development Setup
```bash
# Clone and setup
git clone https://github.com/pik-gane/carrots.git
cd carrots

# Using Docker (Easiest)
docker-compose up -d

# Manual setup - Backend
cd backend
npm install
cp .env.example .env  # Edit with your settings
npm run prisma:migrate:dev
npm run dev

# Manual setup - Frontend  
cd frontend
npm install
npm start
```

### Daily Development
```bash
# Start backend (from backend/)
npm run dev                    # Development mode with hot reload

# Start frontend (from frontend/)
npm start                      # Development server

# Run tests
npm test                       # Run tests
npm run test:watch            # Watch mode
npm run test:coverage         # With coverage

# Linting
npm run lint                   # Check for errors
npm run format                 # Auto-format code
```

### Database Operations
```bash
# From backend/ directory
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate:dev     # Create migration
npm run prisma:migrate         # Apply migrations
npm run prisma:reset           # Reset database (⚠️ deletes data)
npm run prisma:seed            # Seed with sample data
npx prisma studio              # Visual database browser
```

## Project URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/health
- **API Docs**: http://localhost:3001/api
- **Prisma Studio**: http://localhost:5555 (when running)

## File Locations

### Backend
- **Entry point**: `backend/src/server.ts`
- **Routes**: `backend/src/routes/`
- **Services**: `backend/src/services/`
- **Models**: `backend/prisma/schema.prisma`
- **Types**: `backend/src/types/`
- **Tests**: `*.test.ts` files

### Frontend
- **Entry point**: `frontend/src/index.tsx`
- **Main app**: `frontend/src/App.tsx`
- **Pages**: `frontend/src/pages/`
- **Components**: `frontend/src/components/`
- **Hooks**: `frontend/src/hooks/`
- **Types**: `frontend/src/types/`

## API Endpoints Quick Reference

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Groups
- `POST /api/groups` - Create group
- `GET /api/groups` - List user's groups
- `GET /api/groups/:id` - Get group details
- `POST /api/groups/:id/join` - Join group
- `POST /api/groups/:id/leave` - Leave group

### Commitments
- `POST /api/commitments` - Create commitment
- `GET /api/commitments` - List commitments
- `PUT /api/commitments/:id` - Update commitment
- `DELETE /api/commitments/:id` - Revoke commitment
- `POST /api/commitments/parse` - Parse natural language

### Liabilities
- `GET /api/groups/:id/liabilities` - Group liabilities
- `GET /api/users/:id/liabilities` - User liabilities

## Data Models

### Commitment Structure
```typescript
{
  condition: {
    type: 'single_user' | 'aggregate',
    targetUserId?: string,        // For single_user
    action: string,               // e.g., "work", "weeding"
    minAmount: number,            // e.g., 5
    unit: string                  // e.g., "hours"
  },
  promise: {
    action: string,               // What you'll do
    minAmount: number,            // How much
    unit: string                  // Unit of measurement
  }
}
```

### Example Commitments

**Single-user condition:**
```
"If Alice does at least 5 hours of work, I will do at least 3 hours of work"
```

**Aggregate condition:**
```
"If others collectively do at least 10 hours of work, I will do at least 5 hours"
```

## Environment Variables

### Backend (.env)
```bash
DATABASE_URL="postgresql://user:pass@localhost:5432/carrots_dev"
JWT_SECRET="your-secret-key"
OPENAI_API_KEY="sk-your-key"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:3000"
```

### Frontend (.env)
```bash
REACT_APP_API_URL=http://localhost:3001
```

## Common Tasks

### Add New API Endpoint
1. Create route handler in `backend/src/routes/`
2. Add validation
3. Implement service logic
4. Write tests
5. Update `docs/API.md`

### Add New Frontend Page
1. Create component in `frontend/src/pages/`
2. Add route in `App.tsx`
3. Create API service call
4. Style with Material-UI
5. Write tests

### Update Database Schema
1. Edit `backend/prisma/schema.prisma`
2. Run `npm run prisma:migrate:dev`
3. Update seed data if needed
4. Update TypeScript types

## Testing

### Backend Test Structure
```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should do something', async () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = await service.method(input);
      
      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Frontend Test Structure
```typescript
import { render, screen } from '@testing-library/react';
import Component from './Component';

describe('Component', () => {
  it('renders correctly', () => {
    render(<Component />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Port Already in Use
```bash
# macOS/Linux
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# Check database exists
psql -l | grep carrots

# Recreate database
dropdb carrots_dev
createdb carrots_dev
npm run prisma:migrate:dev
```

### Prisma Client Not Generated
```bash
cd backend
npm run prisma:generate
```

### Module Not Found
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Git Workflow

### Feature Development
```bash
# Create feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/my-feature
```

### Commit Message Convention
```
feat: Add new feature
fix: Fix bug
docs: Update documentation
test: Add tests
refactor: Refactor code
style: Format code
chore: Update dependencies
```

## Useful Scripts

### Database
```bash
# Backup database
pg_dump carrots_dev > backup.sql

# Restore database
psql carrots_dev < backup.sql
```

### Docker
```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f [service]

# Stop services
docker-compose down

# Rebuild
docker-compose up -d --build
```

## Code Snippets

### API Request (Frontend)
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Prisma Query (Backend)
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Find with relations
const group = await prisma.group.findUnique({
  where: { id: groupId },
  include: {
    memberships: {
      include: {
        user: true,
      },
    },
  },
});
```

## Resources

- [Architecture Docs](./ARCHITECTURE.md)
- [Implementation Strategy](./IMPLEMENTATION_STRATEGY.md)
- [API Documentation](./docs/API.md)
- [Getting Started](./docs/GETTING_STARTED.md)
- [Commitment Logic](./docs/COMMITMENT_LOGIC.md)
- [System Diagrams](./docs/DIAGRAMS.md)
- [Contributing Guide](./CONTRIBUTING.md)

## Support

- GitHub Issues: Report bugs or request features
- Documentation: Check docs/ directory
- Code: Review implementation strategy for guidance

---
**Quick Tip**: Use `docker-compose up -d` for the fastest setup! 🥕
