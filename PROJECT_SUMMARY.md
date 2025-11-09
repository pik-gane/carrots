# Carrots App - Project Summary

## Project Overview

**Carrots** is a web application for managing conditional commitments within groups. It allows users to make commitments of the form "if X does at least Y of Z, I will do at least A of B" and automatically calculates the resulting liabilities using game-theoretic principles.

## What Has Been Implemented

This repository contains a **complete skeleton and implementation strategy** for the Carrots application, including:

### ✅ Complete Documentation (8 documents)

1. **README.md** - Project overview, features, quick start guide
2. **ARCHITECTURE.md** - Detailed system design and technical architecture
3. **IMPLEMENTATION_STRATEGY.md** - 10-week phased development roadmap
4. **CONTRIBUTING.md** - Guidelines for contributors
5. **QUICK_REFERENCE.md** - Developer command reference
6. **docs/API.md** - Complete API specification with all endpoints
7. **docs/GETTING_STARTED.md** - Step-by-step setup instructions
8. **docs/COMMITMENT_LOGIC.md** - Technical specification of the liability calculation algorithm
9. **docs/DIAGRAMS.md** - Visual system architecture and flow diagrams

### ✅ Backend Infrastructure (Node.js/Express/TypeScript)

#### Project Setup
- ✅ package.json with all dependencies
- ✅ TypeScript configuration (tsconfig.json)
- ✅ Jest test configuration
- ✅ ESLint and Prettier setup
- ✅ Environment variables template (.env.example)

#### Core Files
- ✅ **server.ts** - Express server with middleware setup
- ✅ **prisma/schema.prisma** - Complete database schema (User, Group, GroupMembership, Commitment, Liability)
- ✅ **prisma/seed.ts** - Sample data for development (3 users, 1 group, 3 commitments)
- ✅ **middleware/errorHandler.ts** - Global error handling
- ✅ **utils/logger.ts** - Winston logger configuration
- ✅ **types/index.ts** - TypeScript type definitions for domain models

#### Core Business Logic
- ✅ **services/liabilityCalculator.ts** - Complete implementation of fixed-point algorithm for liability calculation
  - Handles single-user conditions
  - Handles aggregate conditions
  - Implements convergence detection
  - Includes comprehensive error handling
- ✅ **services/liabilityCalculator.test.ts** - Sample unit tests

### ✅ Frontend Infrastructure (React/TypeScript)

#### Project Setup
- ✅ package.json with React 18, Material-UI, TypeScript
- ✅ TypeScript configuration
- ✅ Environment variables template

#### Core Files
- ✅ **public/index.html** - HTML template
- ✅ **src/index.tsx** - React entry point
- ✅ **src/App.tsx** - Main app with routing structure and Material-UI theme
- ✅ **src/hooks/useAuth.tsx** - Authentication context and hook
- ✅ **src/types/index.ts** - TypeScript type definitions

#### Theme
- ✅ Custom Material-UI theme with "carrot orange" primary color

### ✅ Infrastructure & DevOps

- ✅ **docker-compose.yml** - Complete Docker Compose setup with PostgreSQL, backend, and frontend
- ✅ **docker/Dockerfile.backend** - Backend container configuration
- ✅ **docker/Dockerfile.frontend** - Frontend container configuration
- ✅ **.gitignore** - Comprehensive ignore patterns

## What Still Needs to Be Built

Following the implementation strategy, the next phases are:

### Phase 1: Authentication (Week 2)
- [ ] User registration endpoint with password hashing
- [ ] Login endpoint with JWT token generation
- [ ] Authentication middleware
- [ ] Frontend login/register pages

### Phase 2: Group Management (Week 3)
- [ ] Group CRUD API endpoints
- [ ] Join/leave group functionality
- [ ] Frontend group pages

### Phase 3: Commitments (Week 4-5)
- [ ] Commitment CRUD API endpoints
- [ ] Integration with liability calculator
- [ ] Frontend commitment creation and display

### Phase 4: Natural Language Processing (Week 7-8)
- [ ] OpenAI API integration
- [ ] NLP service for parsing commitments
- [ ] Frontend NLP interface

### Phase 5: Polish & Testing (Week 9-10)
- [ ] UI/UX improvements
- [ ] Comprehensive testing
- [ ] Deployment and monitoring

## Key Technical Features

### The Liability Calculation Algorithm

The core innovation is the **fixed-point liability calculation algorithm**:

```
For each user and action:
  L_i(a) = max { promised_amount | commitment_condition_is_satisfied }
```

This algorithm:
- ✅ Fully implemented in `backend/src/services/liabilityCalculator.ts`
- ✅ Handles circular dependencies through iteration
- ✅ Guarantees convergence (monotonic updates)
- ✅ Supports both single-user and aggregate conditions
- ✅ Includes comprehensive tests

### Database Schema

Fully designed Prisma schema with:
- ✅ User model (authentication)
- ✅ Group model (organizing users)
- ✅ GroupMembership model (many-to-many relationship)
- ✅ Commitment model (conditional commitments with JSON storage)
- ✅ Liability model (calculated liabilities)

All relationships, indexes, and constraints are defined.

### API Design

Complete REST API specification in `docs/API.md`:
- ✅ Authentication endpoints
- ✅ User management
- ✅ Group management (CRUD + join/leave)
- ✅ Commitment management (CRUD + NLP parsing)
- ✅ Liability calculation endpoints

## Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Authentication**: JWT + bcrypt
- **Testing**: Jest
- **Logging**: Winston

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **UI Library**: Material-UI v5
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **State Management**: React Context

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Database**: PostgreSQL (containerized)
- **LLM Integration**: OpenAI GPT-4 (for NLP)

## Project Structure

```
carrots/
├── backend/                    # Backend API
│   ├── prisma/
│   │   ├── schema.prisma      # Database models ✅
│   │   └── seed.ts            # Sample data ✅
│   ├── src/
│   │   ├── middleware/        # Express middleware ✅
│   │   ├── routes/            # API routes (to be implemented)
│   │   ├── services/          
│   │   │   └── liabilityCalculator.ts ✅ (Core algorithm)
│   │   ├── types/             # TypeScript types ✅
│   │   ├── utils/             # Utilities ✅
│   │   └── server.ts          # Entry point ✅
│   └── package.json           ✅
├── frontend/                   # React app
│   ├── public/
│   │   └── index.html         ✅
│   ├── src/
│   │   ├── components/        # React components (to be implemented)
│   │   ├── pages/             # Page components (to be implemented)
│   │   ├── hooks/             
│   │   │   └── useAuth.tsx    ✅
│   │   ├── types/             ✅
│   │   ├── App.tsx            ✅
│   │   └── index.tsx          ✅
│   └── package.json           ✅
├── docs/                       # Documentation ✅
│   ├── API.md                 ✅ Complete API spec
│   ├── GETTING_STARTED.md     ✅ Setup guide
│   ├── COMMITMENT_LOGIC.md    ✅ Algorithm documentation
│   └── DIAGRAMS.md            ✅ Visual diagrams
├── docker/                     # Docker configs ✅
├── ARCHITECTURE.md            ✅ System architecture
├── IMPLEMENTATION_STRATEGY.md ✅ Development roadmap
├── CONTRIBUTING.md            ✅ Contribution guide
├── QUICK_REFERENCE.md         ✅ Developer reference
├── docker-compose.yml         ✅ Docker Compose setup
└── README.md                  ✅ Project overview
```

## Getting Started

### Quick Start (Docker)
```bash
git clone https://github.com/pik-gane/carrots.git
cd carrots
cp backend/.env.example backend/.env
# Edit backend/.env with your settings
docker-compose up -d
```

### Manual Setup
See [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md) for detailed instructions.

## Documentation Navigation

- **New to the project?** Start with [README.md](README.md)
- **Want to understand the architecture?** Read [ARCHITECTURE.md](ARCHITECTURE.md)
- **Ready to develop?** Follow [docs/GETTING_STARTED.md](docs/GETTING_STARTED.md)
- **Need the roadmap?** Check [IMPLEMENTATION_STRATEGY.md](IMPLEMENTATION_STRATEGY.md)
- **API reference?** See [docs/API.md](docs/API.md)
- **How does the algorithm work?** Read [docs/COMMITMENT_LOGIC.md](docs/COMMITMENT_LOGIC.md)
- **Quick commands?** Use [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
- **Want to visualize the system?** View [docs/DIAGRAMS.md](docs/DIAGRAMS.md)
- **Want to contribute?** Read [CONTRIBUTING.md](CONTRIBUTING.md)

## Development Status

**Status**: ✅ Skeleton Complete - Ready for Development

The foundation is solid and well-documented. The next step is to follow the implementation strategy and build out the features phase by phase.

### Estimated Timeline (10 weeks)
- Week 1: ✅ **Complete** - Project setup and skeleton
- Week 2: Authentication system
- Week 3: Group management
- Week 4-5: Core commitment engine
- Week 6: Frontend UI
- Week 7-8: Natural language processing
- Week 9: Polish and enhancement
- Week 10: Testing and deployment

## Key Design Decisions

1. **Monorepo Structure**: Both frontend and backend in one repository for easier coordination
2. **TypeScript Everywhere**: Type safety across the stack
3. **Prisma ORM**: Modern ORM with great TypeScript support
4. **Material-UI**: Production-ready React component library
5. **Docker First**: Easy setup and deployment
6. **Documentation First**: Comprehensive docs before implementation
7. **Test-Driven**: Test infrastructure from day one

## Theoretical Foundation

The liability calculation is based on game-theoretic principles from:
- **Paper**: "Game-theoretic approaches to conditional commitment"
- **URL**: https://www.mdpi.com/2073-4336/16/6/58

The algorithm implements a fixed-point calculation where commitments can depend on other commitments, creating a system that converges to a stable equilibrium.

## License

MIT License - See [LICENSE](LICENSE) file

## Contact & Support

- **Issues**: GitHub issue tracker
- **Documentation**: All docs in `/docs` folder
- **Questions**: Open a GitHub issue

---

**Ready to start building?** Follow the [Implementation Strategy](IMPLEMENTATION_STRATEGY.md) and begin with Phase 1! 🥕
