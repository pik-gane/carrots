# Carrots App Architecture

## Overview
Carrots is a web application for managing conditional commitments within groups. Users can make commitments like "if X does at least Y of Z, I will do at least A of B" and the system calculates resulting liabilities.

## System Architecture

### High-Level Architecture
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Backend    │────▶│  Database   │
│   (React)   │◀────│  (Express)   │◀────│ (PostgreSQL)│
└─────────────┘     └──────────────┘     └─────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  LLM Service │
                    │   (OpenAI)   │
                    └──────────────┘
```

### Technology Stack

#### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: React Context API / Redux
- **UI Components**: Material-UI or shadcn/ui
- **Routing**: React Router
- **HTTP Client**: Axios
- **Form Management**: React Hook Form

#### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Authentication**: JWT + bcrypt
- **Validation**: Zod or Joi
- **ORM**: Prisma or TypeORM
- **API Documentation**: OpenAPI/Swagger

#### Database
- **Primary Database**: PostgreSQL 14+
- **Schema**: Normalized relational design
- **Migrations**: Prisma Migrate or TypeORM migrations

#### External Services
- **LLM Integration**: OpenAI API (GPT-4) for natural language processing
- **Deployment**: Docker containers

## Core Data Models

### User
- id (UUID)
- username (unique)
- email (unique)
- passwordHash
- createdAt
- updatedAt

### Group
- id (UUID)
- name
- description
- creatorId (FK → User)
- createdAt
- updatedAt

### GroupMembership
- id (UUID)
- groupId (FK → Group)
- userId (FK → User)
- joinedAt
- role (creator | member)

### Commitment
- id (UUID)
- groupId (FK → Group)
- creatorId (FK → User)
- status (active | revoked)
- conditionType (single_user | aggregate)
- naturalLanguageText (original text)
- parsedCommitment (JSON structure)
- createdAt
- updatedAt
- revokedAt

### CommitmentCondition
- id (UUID)
- commitmentId (FK → Commitment)
- targetUserId (FK → User, nullable for aggregate)
- targetAction (string)
- minAmount (numeric)
- unit (string)

### CommitmentPromise
- id (UUID)
- commitmentId (FK → Commitment)
- promisedAction (string)
- minAmount (numeric)
- unit (string)

### Liability (Calculated)
- id (UUID)
- groupId (FK → Group)
- userId (FK → User)
- action (string)
- amount (numeric)
- unit (string)
- calculatedAt
- effectiveCommitmentIds (JSON array of commitment IDs)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users/:id` - Get user by ID
- `GET /api/users` - List users (with search/filter)

### Groups
- `POST /api/groups` - Create new group
- `GET /api/groups` - List user's groups
- `GET /api/groups/:id` - Get group details
- `PUT /api/groups/:id` - Update group
- `DELETE /api/groups/:id` - Delete group
- `POST /api/groups/:id/join` - Join group
- `POST /api/groups/:id/leave` - Leave group
- `GET /api/groups/:id/members` - List group members

### Commitments
- `POST /api/commitments` - Create new commitment (with NLP processing)
- `GET /api/commitments` - List commitments (filter by group, user, status)
- `GET /api/commitments/:id` - Get commitment details
- `PUT /api/commitments/:id` - Update commitment
- `DELETE /api/commitments/:id` - Revoke commitment
- `POST /api/commitments/parse` - Parse natural language to structured commitment

### Liabilities
- `GET /api/groups/:id/liabilities` - Calculate and get current liabilities for group
- `GET /api/users/:id/liabilities` - Get user's liabilities across all groups

## Commitment Logic Engine

### Commitment Structure
```typescript
interface ParsedCommitment {
  condition: {
    type: 'single_user' | 'aggregate';
    targetUserId?: string;  // for single_user
    action: string;
    minAmount: number;
    unit: string;
  };
  promise: {
    action: string;
    minAmount: number;
    unit: string;
  };
}
```

### Liability Calculation Algorithm

Based on the theory from the paper, the liability calculation follows these steps:

1. **Collect Active Commitments**: Get all active commitments in the group
2. **Evaluate Conditions**: For each commitment, determine if conditions are met
3. **Apply Fixed-Point Calculation**: Iteratively calculate liabilities until convergence
   - Start with zero liabilities for all users
   - For each iteration:
     - Evaluate each commitment's condition against current state
     - If condition is satisfied, add promise to user's liability
     - Continue until no changes occur (fixed point reached)
4. **Return Liabilities**: Final liabilities for each user

```
L_i(a) = max { c_i(a, C_j) | j ∈ commitments, condition(C_j) is satisfied }

Where:
- L_i(a) = liability of user i for action a
- c_i(a, C_j) = commitment amount from commitment C_j
- Condition satisfaction depends on other users' liabilities (hence fixed-point)
```

## Natural Language Processing

### LLM Integration Flow
1. User enters natural language commitment
2. Backend sends to LLM with structured prompt
3. LLM extracts:
   - Condition type (single_user | aggregate)
   - Target user (if single_user)
   - Condition action and amount
   - Promise action and amount
4. If ambiguous, LLM requests clarification
5. Backend validates and stores parsed commitment

### Example Prompt Template
```
Parse the following commitment into structured form:
"{user_input}"

Group members: {member_list}

Extract:
1. Condition type (single_user or aggregate)
2. If single_user: which user is mentioned
3. Condition: action, minimum amount, unit
4. Promise: action, minimum amount, unit

If unclear, ask for clarification.
```

## Frontend Components

### Page Structure
- **Landing Page**: App introduction, login/register
- **Dashboard**: User's groups and commitments overview
- **Group View**: Group details, members, commitments, liabilities
- **Commitment Creation**: Natural language input with preview
- **Commitment List**: View/edit/revoke commitments
- **Liability View**: Current liabilities visualization

### Key UI Components
- `GroupCard`: Display group summary
- `CommitmentCard`: Display commitment details
- `CommitmentForm`: Natural language input with AI assistance
- `LiabilityChart`: Visualize liabilities
- `MemberList`: Show group members
- `CommitmentList`: Filterable list of commitments

## Security Considerations

1. **Authentication**: JWT tokens with secure httpOnly cookies
2. **Authorization**: Role-based access control (RBAC)
3. **Input Validation**: Zod schemas for all inputs
4. **SQL Injection**: Use ORM parameterized queries
5. **XSS Prevention**: React's built-in escaping + CSP headers
6. **Rate Limiting**: Limit API requests per user
7. **LLM Safety**: Validate LLM outputs before storing

## Deployment

### Development Environment
```bash
# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm start
```

### Production Deployment
- Docker containers for backend and frontend
- PostgreSQL managed database
- Environment variables for configuration
- HTTPS with SSL certificates
- CDN for static assets

### Environment Variables
```
# Backend
DATABASE_URL=postgresql://...
JWT_SECRET=...
OPENAI_API_KEY=...
PORT=3001
NODE_ENV=production

# Frontend
REACT_APP_API_URL=https://api.carrots.app
```

## Testing Strategy

### Backend Tests
- Unit tests: Individual functions (commitment parser, liability calculator)
- Integration tests: API endpoints
- E2E tests: Full user flows

### Frontend Tests
- Component tests: React Testing Library
- Integration tests: User interactions
- E2E tests: Cypress

## Future Enhancements

1. **Real-time Updates**: WebSocket for live liability updates
2. **Notifications**: Email/push notifications for new commitments
3. **Analytics**: Dashboard for commitment statistics
4. **Export**: Export commitments and liabilities to CSV/PDF
5. **Mobile App**: React Native mobile application
6. **Multi-language**: i18n support
7. **Advanced Conditions**: Support for more complex conditional logic
8. **Commitment Templates**: Pre-defined commitment templates
9. **Group Settings**: Configurable group rules and permissions
10. **Audit Log**: Track all changes to commitments
