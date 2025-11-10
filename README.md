# Carrots - Conditional Commitments Platform

A web application for managing conditional commitments within groups. Users can make commitments like "if X does at least Y of Z, I will do at least A of B" and the system calculates resulting liabilities based on game-theoretic principles.

## Features

- **Group Management**: Create and join groups for coordinating commitments
- **Conditional Commitments**: Make commitments that depend on others' actions
- **Automatic Liability Calculation**: System computes who needs to do what based on all active commitments
- **Natural Language Interface**: Express commitments in plain English (powered by LLM)
- **Real-time Updates**: See how commitments affect liabilities in real-time

## Project Structure

```
carrots/
├── backend/           # Node.js/Express API server
│   ├── src/
│   │   ├── models/    # Database models
│   │   ├── routes/    # API routes
│   │   ├── services/  # Business logic
│   │   ├── utils/     # Utilities
│   │   └── server.ts  # Entry point
│   ├── prisma/        # Database schema and migrations
│   └── package.json
├── frontend/          # React TypeScript application
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   └── App.tsx
│   └── package.json
├── docs/              # Documentation
└── docker/            # Docker configurations
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- npm or yarn
- OpenAI API key (for natural language processing)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/pik-gane/carrots.git
   cd carrots
   ```

2. **Set up the database**
   ```bash
   # Install PostgreSQL and create database
   createdb carrots_dev
   ```

3. **Set up backend**
   ```bash
   cd backend
   npm install
   
   # Create .env file
   cp .env.example .env
   # Edit .env with your database URL and API keys
   
   # Run migrations
   npm run prisma:migrate
   
   # Start development server
   npm run dev
   ```

4. **Set up frontend**
   ```bash
   cd frontend
   npm install
   
   # Create .env file
   cp .env.example .env
   # Edit .env with your API URL
   
   # Start development server
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Docs: http://localhost:3001/api-docs

## Documentation

- [Architecture Documentation](./ARCHITECTURE.md) - System design and technical architecture
- [Implementation Strategy](./IMPLEMENTATION_STRATEGY.md) - Development roadmap and implementation plan
- [API Documentation](./backend/docs/API.md) - API endpoints and usage (coming soon)
- [User Guide](./docs/USER_GUIDE.md) - How to use the application (coming soon)

## Core Concepts

### Conditional Commitments

A conditional commitment has two parts:
1. **Condition**: "if X does at least Y of Z" or "if others do at least Y of Z"
2. **Promise**: "I will do at least A of B"

Example: "If Alice completes at least 5 hours of work, I will complete at least 3 hours of work"

### Liability Calculation

The system uses a fixed-point algorithm to calculate liabilities:
- Evaluates all active commitments
- Determines which conditions are satisfied
- Calculates minimum actions each person must take
- Iterates until a stable solution is reached

This is based on the theoretical framework from: [Game-theoretic approaches to conditional commitment](https://www.mdpi.com/2073-4336/16/6/58)

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT
- **LLM Integration**: OpenAI GPT-4

### Frontend
- **Framework**: React 18+
- **Language**: TypeScript
- **UI Library**: Material-UI
- **State Management**: React Context
- **Routing**: React Router
- **HTTP Client**: Axios

### Infrastructure
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Testing**: Jest, React Testing Library, Cypress

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm test
npm run test:coverage

# Frontend tests
cd frontend
npm test
npm run test:coverage

# E2E tests
npm run test:e2e
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

```bash
cd backend

# Create a new migration
npm run prisma:migrate:dev

# Apply migrations
npm run prisma:migrate

# Reset database (development only)
npm run prisma:reset
```

## Deployment

### Using Docker

```bash
# Build and run all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Variables

#### Backend (.env)
```env
DATABASE_URL=postgresql://user:password@localhost:5432/carrots
JWT_SECRET=your-secret-key
OPENAI_API_KEY=sk-...
PORT=3001
NODE_ENV=production
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please ensure:
- All tests pass
- Code follows the style guide (run linter)
- Documentation is updated
- Commit messages are descriptive

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Theoretical foundation from the paper: [Game-theoretic approaches to conditional commitment](https://www.mdpi.com/2073-4336/16/6/58)
- Inspired by the original carrots app concept

## Support

For questions, issues, or suggestions:
- Open an issue on GitHub
- Check the [documentation](./docs)
- Review the [implementation strategy](./IMPLEMENTATION_STRATEGY.md)

## Roadmap

See [IMPLEMENTATION_STRATEGY.md](./IMPLEMENTATION_STRATEGY.md) for detailed development roadmap.

### MVP (Version 1.0)
- [x] Project structure and documentation
- [x] User authentication (backend API complete - see [TESTING_AUTH_API.md](./TESTING_AUTH_API.md))
- [x] User profile and settings frontend (Phase 2.4 complete)
- [ ] Group management
- [ ] Structured commitment creation
- [ ] Liability calculation engine

### Future Enhancements
- [ ] Natural language commitment parsing
- [ ] Real-time updates via WebSockets
- [ ] Mobile application
- [ ] Advanced visualizations
- [ ] Export functionality
- [ ] Notification system
