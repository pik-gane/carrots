# Implementation Strategy for Carrots App

## Phase 1: Project Setup and Core Infrastructure (Week 1)

### 1.1 Initialize Project Structure
- [ ] Create monorepo structure with backend and frontend folders
- [ ] Initialize Node.js/TypeScript project for backend
- [ ] Initialize React/TypeScript project for frontend
- [ ] Set up ESLint, Prettier, and TypeScript configs
- [ ] Create Docker configuration files
- [ ] Set up Git workflow and branch protection

### 1.2 Database Setup
- [ ] Install and configure PostgreSQL
- [ ] Set up Prisma ORM
- [ ] Create initial schema based on data models
- [ ] Generate Prisma client
- [ ] Set up migration system
- [ ] Create seed data for development

### 1.3 Backend Foundation
- [ ] Initialize Express.js application
- [ ] Configure TypeScript for Node.js
- [ ] Set up environment variable management
- [ ] Configure CORS and security middleware
- [ ] Set up logging (Winston or Pino)
- [ ] Create base error handling
- [ ] Set up API versioning

## Phase 2: Authentication and User Management (Week 2)

### 2.1 Authentication System
- [ ] Implement user registration endpoint
- [ ] Implement password hashing with bcrypt
- [ ] Implement JWT token generation
- [ ] Implement login endpoint
- [ ] Implement logout endpoint
- [ ] Create authentication middleware
- [ ] Add refresh token mechanism
- [ ] Write tests for auth flow

### 2.2 User Management
- [ ] Create User model and repository
- [ ] Implement user CRUD operations
- [ ] Add user profile endpoints
- [ ] Create user validation schemas
- [ ] Write tests for user operations

### 2.3 Frontend Auth
- [x] Create login page
- [x] Create registration page
- [x] Implement auth context/state management
- [x] Create protected route component
- [x] Add token storage and refresh logic
- [x] Create logout functionality

### 2.4 Frontend User Profile
- [x] Create user profile page to display user information
- [x] Create user settings page for editing profile
- [x] Add user API service methods in frontend
- [x] Add routes for profile and settings pages
- [x] Update navigation to include profile/settings links
- [x] Implement profile update functionality with validation
- [x] Add delete account functionality with confirmation dialog

## Phase 3: Group Management (Week 3)

### 3.1 Backend Group Logic
- [ ] Create Group and GroupMembership models
- [ ] Implement group creation endpoint
- [ ] Implement group listing endpoint
- [ ] Implement join/leave group endpoints
- [ ] Add authorization checks (group ownership)
- [ ] Create group member listing endpoint
- [ ] Write tests for group operations

### 3.2 Frontend Group UI
- [ ] Create dashboard page
- [ ] Create group creation form
- [ ] Create group list component
- [ ] Create group detail page
- [ ] Implement join/leave group UI
- [ ] Create member list component
- [ ] Add group navigation

## Phase 4: Core Commitment Engine (Week 4-5)

### 4.1 Commitment Data Models
- [ ] Create Commitment model
- [ ] Create CommitmentCondition model
- [ ] Create CommitmentPromise model
- [ ] Set up relationships and constraints
- [ ] Create validation schemas

### 4.2 Commitment Parser (No LLM Initially)
- [ ] Design structured commitment input format
- [ ] Create commitment parser utility
- [ ] Implement validation logic
- [ ] Add unit tests for parser
- [ ] Create mock commitments for testing

### 4.3 Liability Calculator
- [ ] Implement fixed-point algorithm from paper
- [ ] Create liability calculation service
- [ ] Handle edge cases (circular dependencies, no convergence)
- [ ] Add comprehensive unit tests
- [ ] Test with various commitment scenarios
- [ ] Optimize for performance

### 4.4 Commitment API Endpoints
- [ ] POST /api/commitments - Create commitment
- [ ] GET /api/commitments - List commitments
- [ ] GET /api/commitments/:id - Get commitment
- [ ] PUT /api/commitments/:id - Update commitment
- [ ] DELETE /api/commitments/:id - Revoke commitment
- [ ] Add authorization checks
- [ ] Write integration tests

### 4.5 Liability API Endpoints
- [ ] GET /api/groups/:id/liabilities - Get group liabilities
- [ ] GET /api/users/:id/liabilities - Get user liabilities
- [ ] Add caching for expensive calculations
- [ ] Write integration tests

## Phase 5: Frontend Commitment UI (Week 6)

### 5.1 Commitment Creation
- [ ] Create structured commitment input form
- [ ] Add user/action selection dropdowns
- [ ] Implement form validation
- [ ] Show commitment preview
- [ ] Handle submission and errors

### 5.2 Commitment Display
- [ ] Create commitment card component
- [ ] Create commitment list page
- [ ] Add filtering and sorting
- [ ] Implement commitment detail view
- [ ] Add edit/revoke actions
- [ ] Show commitment status

### 5.3 Liability Display
- [ ] Create liability summary component
- [ ] Implement liability chart/visualization
- [ ] Show liability breakdown by action
- [ ] Add refresh mechanism
- [ ] Display effective commitments

## Phase 6: Natural Language Processing (Week 7-8)

### 6.1 LLM Integration Setup
- [ ] Set up OpenAI API client
- [ ] Create environment variable for API key
- [ ] Implement rate limiting
- [ ] Add error handling for API failures
- [ ] Create fallback mechanism

### 6.2 NLP Service
- [ ] Design prompt templates
- [ ] Implement commitment parsing function
- [ ] Add context about group members
- [ ] Handle ambiguous inputs
- [ ] Implement clarification flow
- [ ] Add validation of LLM outputs
- [ ] Create comprehensive tests with real examples

### 6.3 Frontend NLP Integration
- [ ] Add natural language text input
- [ ] Show parsing progress indicator
- [ ] Display parsed commitment for confirmation
- [ ] Handle clarification requests
- [ ] Allow switching between NLP and structured input
- [ ] Add helpful examples and tips

## Phase 7: Polish and Enhancement (Week 9)

### 7.1 UI/UX Improvements
- [ ] Design consistent styling with Material-UI/Tailwind
- [ ] Add loading states
- [ ] Implement error boundaries
- [ ] Add success/error notifications
- [ ] Improve responsive design
- [ ] Add keyboard shortcuts
- [ ] Improve accessibility (ARIA labels, keyboard navigation)

### 7.2 Performance Optimization
- [ ] Add database indexes
- [ ] Implement API response caching
- [ ] Optimize liability calculation
- [ ] Add pagination for lists
- [ ] Implement lazy loading
- [ ] Bundle optimization for frontend

### 7.3 Documentation
- [ ] Write API documentation (OpenAPI)
- [ ] Create user guide
- [ ] Add inline code comments
- [ ] Create deployment guide
- [ ] Write contribution guidelines

## Phase 8: Testing and Deployment (Week 10)

### 8.1 Comprehensive Testing
- [ ] Achieve 80%+ backend code coverage
- [ ] Write E2E tests with Cypress
- [ ] Perform load testing
- [ ] Security audit
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing

### 8.2 Deployment Setup
- [ ] Create Dockerfile for backend
- [ ] Create Dockerfile for frontend
- [ ] Set up docker-compose for local development
- [ ] Configure production environment variables
- [ ] Set up CI/CD pipeline (GitHub Actions)
- [ ] Deploy to staging environment
- [ ] Perform UAT (User Acceptance Testing)

### 8.3 Production Launch
- [ ] Deploy to production
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy
- [ ] Set up alerts
- [ ] Create runbook for operations
- [ ] Announce launch

## Key Implementation Details

### Liability Calculation Algorithm (Pseudocode)

```javascript
function calculateLiabilities(groupId) {
  // Get all active commitments for the group
  const commitments = getActiveCommitments(groupId);
  const users = getGroupMembers(groupId);
  const actions = extractAllActions(commitments);
  
  // Initialize liabilities to zero
  let liabilities = initializeLiabilities(users, actions);
  let previousLiabilities = null;
  let iterations = 0;
  const MAX_ITERATIONS = 100;
  
  // Fixed-point iteration
  while (!converged(liabilities, previousLiabilities) && iterations < MAX_ITERATIONS) {
    previousLiabilities = deepCopy(liabilities);
    
    for (const commitment of commitments) {
      const conditionMet = evaluateCondition(
        commitment.condition,
        liabilities
      );
      
      if (conditionMet) {
        const userId = commitment.creatorId;
        const action = commitment.promise.action;
        const amount = commitment.promise.minAmount;
        
        liabilities[userId][action] = Math.max(
          liabilities[userId][action] || 0,
          amount
        );
      }
    }
    
    iterations++;
  }
  
  if (iterations >= MAX_ITERATIONS) {
    throw new Error('Liability calculation did not converge');
  }
  
  return liabilities;
}

function evaluateCondition(condition, currentLiabilities) {
  if (condition.type === 'single_user') {
    const userId = condition.targetUserId;
    const action = condition.action;
    const userLiability = currentLiabilities[userId]?.[action] || 0;
    return userLiability >= condition.minAmount;
  } else if (condition.type === 'aggregate') {
    const action = condition.action;
    const totalLiability = Object.values(currentLiabilities)
      .reduce((sum, userActions) => sum + (userActions[action] || 0), 0);
    return totalLiability >= condition.minAmount;
  }
  return false;
}
```

### LLM Prompt Template

```javascript
const COMMITMENT_PARSE_PROMPT = `
You are a commitment parser for the Carrots app. Parse natural language commitments into structured format.

Group members: {memberNames}

User's statement: "{naturalLanguageCommitment}"

Extract the following information:
1. Condition type: Is this about a specific user or all others combined?
   - "single_user": Conditioned on one specific person
   - "aggregate": Conditioned on combined actions of others

2. If single_user, identify which member from the list

3. Condition details:
   - action: What action/task (string)
   - minAmount: Minimum quantity (number)
   - unit: Unit of measurement (string)

4. Promise details:
   - action: What the user will do (string)
   - minAmount: Minimum quantity (number)
   - unit: Unit of measurement (string)

If anything is ambiguous or unclear, respond with a clarification question.

Response format (JSON):
{
  "success": true,
  "parsed": {
    "conditionType": "single_user" | "aggregate",
    "targetUser": "username or null",
    "condition": {
      "action": "string",
      "minAmount": number,
      "unit": "string"
    },
    "promise": {
      "action": "string",
      "minAmount": number,
      "unit": "string"
    }
  }
}

OR if clarification needed:
{
  "success": false,
  "clarificationNeeded": "What specific question to ask"
}
`;
```

### Database Schema (Prisma)

```prisma
model User {
  id            String   @id @default(uuid())
  username      String   @unique
  email         String   @unique
  passwordHash  String
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  createdGroups      Group[]           @relation("GroupCreator")
  groupMemberships   GroupMembership[]
  commitments        Commitment[]
  liabilities        Liability[]
}

model Group {
  id          String   @id @default(uuid())
  name        String
  description String?
  creatorId   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  creator      User              @relation("GroupCreator", fields: [creatorId], references: [id])
  memberships  GroupMembership[]
  commitments  Commitment[]
  liabilities  Liability[]
}

model GroupMembership {
  id        String   @id @default(uuid())
  groupId   String
  userId    String
  role      String   // "creator" | "member"
  joinedAt  DateTime @default(now())
  
  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([groupId, userId])
}

model Commitment {
  id                  String   @id @default(uuid())
  groupId             String
  creatorId           String
  status              String   // "active" | "revoked"
  conditionType       String   // "single_user" | "aggregate"
  naturalLanguageText String?
  parsedCommitment    Json
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  revokedAt           DateTime?
  
  group   Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  creator User  @relation(fields: [creatorId], references: [id], onDelete: Cascade)
}

model Liability {
  id                      String   @id @default(uuid())
  groupId                 String
  userId                  String
  action                  String
  amount                  Float
  unit                    String
  calculatedAt            DateTime @default(now())
  effectiveCommitmentIds  Json     // Array of commitment IDs
  
  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([groupId, userId, action])
}
```

## Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/commitment-creation

# Develop with tests
npm run test:watch

# Run linting
npm run lint

# Commit changes
git add .
git commit -m "feat: add commitment creation endpoint"

# Push and create PR
git push origin feature/commitment-creation
```

### 2. Code Review Checklist
- [ ] Tests pass
- [ ] Code coverage maintained/improved
- [ ] No linting errors
- [ ] Documentation updated
- [ ] No security vulnerabilities
- [ ] Performance considered
- [ ] Accessibility checked (frontend)
- [ ] Mobile responsive (frontend)

### 3. Deployment Process
```bash
# Merge to main
git checkout main
git merge feature/commitment-creation

# Run migrations
npm run prisma:migrate

# Build
npm run build

# Deploy
docker-compose up -d
```

## Risk Mitigation

### Technical Risks
1. **LLM API Costs**: Implement caching, rate limiting, and fallback to structured input
2. **Liability Calculation Convergence**: Set iteration limits, detect cycles, provide warnings
3. **Database Performance**: Add proper indexes, implement caching, pagination
4. **Security**: Regular security audits, dependency updates, input validation

### Project Risks
1. **Scope Creep**: Focus on MVP first, defer advanced features
2. **Timeline**: Use agile sprints, adjust scope if needed
3. **Testing**: Automated tests from day one, continuous integration
4. **Documentation**: Document as you code, not after

## Success Metrics

### Functionality
- [ ] Users can register and login
- [ ] Users can create and join groups
- [ ] Users can create commitments (structured input)
- [ ] Liabilities are calculated correctly
- [ ] Natural language processing works for common cases
- [ ] Commitments can be updated and revoked

### Quality
- [ ] 80%+ test coverage
- [ ] All linting rules pass
- [ ] No critical security vulnerabilities
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms

### User Experience
- [ ] Intuitive UI/UX
- [ ] Clear error messages
- [ ] Mobile responsive
- [ ] Accessible (WCAG 2.1 AA)

## Next Steps

1. Review this strategy with stakeholders
2. Set up development environment
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews
5. Adjust timeline and scope as needed
