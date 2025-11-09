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
- naturalLanguageText (original text)
- parsedCommitment (JSON structure with conditions array and promises array)
- createdAt
- updatedAt
- revokedAt

**ParsedCommitment Structure (JSON)**:
```json
{
  "conditions": [
    {
      "targetUserId": "uuid",
      "action": "work",
      "minAmount": 5,
      "unit": "hours"
    }
  ],
  "promises": [
    {
      "action": "work",
      "baseAmount": 3,
      "proportionalAmount": 0,
      "unit": "hours"
    },
    {
      "action": "donate",
      "baseAmount": 0,
      "proportionalAmount": 2,
      "referenceUserId": "uuid",
      "referenceAction": "work",
      "thresholdAmount": 10,
      "unit": "dollars"
    }
  ]
}
```

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

Commitments support **conjunctive conditions** and **affine linear promises**:

```typescript
interface ParsedCommitment {
  conditions: CommitmentCondition[];  // Conjunction (AND)
  promises: CommitmentPromise[];  // Multiple promises
}

interface CommitmentCondition {
  targetUserId: string;  // User Ai who must perform action
  action: string;  // Action Xi
  minAmount: number;  // Minimum amount Vi
  unit: string;
}

interface CommitmentPromise {
  action: string;  // Action Yi
  baseAmount: number;  // W0 (constant term)
  proportionalAmount: number;  // Di (coefficient)
  referenceUserId?: string;  // Bi (reference user for proportional)
  referenceAction?: string;  // Action to track for proportional
  thresholdAmount?: number;  // Oi (threshold for "excess")
  unit: string;
}
```

**Example**: "If (A1 does ≥ V1 of X1) AND (A2 does ≥ V2 of X2), then I will do (≥ W0 of Y0) AND (≥ D1 of Y1 for every unit that B1 does of Y1 in excess of O1)"

### Liability Calculation Algorithm

Based on the game-theoretic framework, the liability calculation finds the **largest fixed point**:

1. **Initialization**: Set all liabilities to maximum values occurring in conditions/promises
2. **Iterative Reduction**: For each user-action pair (i, a):
   - Compute L_i(a) = max { c_i(a, C_j) | all conditions of C_j are satisfied }
   - Where c_i(a, C_j) includes base + proportional contributions:
     ```
     c_i(a, C_j) = W0 + Σ_k D_k × max(0, L_Bk(Y_k) - O_k)
     ```
3. **Convergence**: Repeat until no liability changes (largest fixed point reached)

**Key Properties**:
- **Conjunctive conditions**: ALL conditions must be satisfied (AND logic)
- **Affine linear promises**: Base amount + proportional terms based on others' actions
- **Largest fixed point**: Start high, iterate down to stable equilibrium
- **Monotonic**: Liabilities never increase during iteration

```
L_i(a) = max { c_i(a, C_j) | C_j created by i, all conditions of C_j satisfied }

Condition satisfaction:
∀k: L_Ak(X_k) ≥ V_k  (all target users meet their thresholds)

Promise value (affine linear):
c_i(a, C_j) = W0 + Σ_k D_k × max(0, L_Bk(Y_k) - O_k)
```

## Natural Language Processing

### LLM Integration Flow
1. User enters natural language commitment
2. Backend sends to LLM with structured prompt
3. LLM extracts:
   - Array of conditions (conjunctive): each with targetUserId, action, minAmount, unit
   - Array of promises: each with action, baseAmount, proportionalAmount, referenceUserId (if proportional), referenceAction, thresholdAmount, unit
4. If ambiguous, LLM requests clarification
5. Backend validates and stores parsed commitment

### Example Prompt Template
```
Parse the following commitment into structured form:
"{user_input}"

Group members: {member_list}

Extract commitment of the form:
"If ((A1 does at least V1 of X1) AND ... AND (Ak does at least Vk of Xk))
 then I will do (at least W0 of Y0) AND (at least D1 of Y1 for every unit that B1 does of Y1 in excess of O1) AND ..."

Output as JSON:
{
  "conditions": [
    {"targetUserId": "...", "action": "...", "minAmount": number, "unit": "..."}
  ],
  "promises": [
    {"action": "...", "baseAmount": number, "proportionalAmount": number, 
     "referenceUserId": "...", "referenceAction": "...", "thresholdAmount": number, "unit": "..."}
  ]
}

Notes:
- Conditions are conjunctive (all must be satisfied)
- Promises can be constant (baseAmount > 0, proportionalAmount = 0) or proportional
- For proportional: baseAmount = 0, proportionalAmount = coefficient, referenceUserId/Action = who to track, thresholdAmount = threshold

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
