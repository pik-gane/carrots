# Carrots System Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                             │
└────────────────┬────────────────────────────────────────────────┘
                 │
                 │ HTTP/HTTPS
                 │
┌────────────────▼────────────────────────────────────────────────┐
│                     Frontend (React)                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Pages   │  │Components│  │  Hooks   │  │ Services │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│      │              │              │              │              │
│      └──────────────┴──────────────┴──────────────┘              │
│                         │                                        │
│                    React Router                                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ REST API (JSON)
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                     Backend (Express)                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Routes  │→ │ Services │→ │  Models  │→ │  Prisma  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
│       │             │                                            │
│       │             │                                            │
│       │        ┌────▼────────┐                                  │
│       │        │  Liability  │                                  │
│       │        │ Calculator  │                                  │
│       │        └─────────────┘                                  │
│       │                                                          │
│  ┌────▼──────────┐                                              │
│  │  Middleware   │                                              │
│  │ Auth, Error   │                                              │
│  └───────────────┘                                              │
└────────────────────────┬───────────┬─────────────────────────────┘
                         │           │
                         │           │ OpenAI API
                         │           │
                         │      ┌────▼────────┐
                         │      │  LLM/GPT-4  │
                         │      │   (NLP)     │
                         │      └─────────────┘
                         │
                         │ SQL
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      PostgreSQL Database                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  Users   │  │  Groups  │  │Commitment│  │Liability │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow: Creating a Commitment

```
┌──────────┐   1. Enter text    ┌──────────────┐
│   User   │──────────────────→ │   Frontend   │
└──────────┘                     └───────┬──────┘
                                         │
                               2. POST /api/commitments
                                         │
                                 ┌───────▼──────┐
                                 │   Backend    │
                                 │   Router     │
                                 └───────┬──────┘
                                         │
                               3. Parse NL Text
                                         │
                            ┌────────────▼────────────┐
                            │   NLP Service (GPT-4)   │
                            │  - Extract condition    │
                            │  - Extract promise      │
                            │  - Identify target user │
                            └────────────┬────────────┘
                                         │
                              4. Structured commitment
                                         │
                            ┌────────────▼────────────┐
                            │  Commitment Service     │
                            │  - Validate             │
                            │  - Store to DB          │
                            └────────────┬────────────┘
                                         │
                              5. Trigger calculation
                                         │
                            ┌────────────▼────────────┐
                            │  Liability Calculator   │
                            │  - Fixed-point iteration│
                            │  - Update liabilities   │
                            └────────────┬────────────┘
                                         │
                               6. Return result
                                         │
                            ┌────────────▼────────────┐
                            │      Database           │
                            │  - Store commitment     │
                            │  - Store liabilities    │
                            └─────────────────────────┘
```

## Liability Calculation Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Start: calculateGroupLiabilities               │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────▼─────────────┐
         │  Fetch active commitments │
         │  from database            │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │  Initialize all           │
         │  liabilities to 0         │
         └─────────────┬─────────────┘
                       │
         ┌─────────────▼─────────────┐
         │  Fixed-point iteration:   │
         │                           │
         │  For each commitment:     │
         │    1. Evaluate condition  │
         │    2. If met, update      │
         │       promise liability   │
         └─────────────┬─────────────┘
                       │
                       │ Repeat until
                       │ convergence
                       │
         ┌─────────────▼─────────────┐
         │  Check convergence:       │
         │  No changes in liabilities?│
         └─────────┬─────────┬───────┘
                   │         │
              No   │         │ Yes
                   │         │
         ┌─────────▼─────┐   │
         │  Iterations   │   │
         │  < MAX?       │   │
         └─────┬─────┬───┘   │
               │ Yes │       │
               │     │ No    │
               │     │       │
               │  ┌──▼───────▼──┐
               │  │   Return     │
               │  │  liabilities │
               │  └──────────────┘
               │
        ┌──────▼──────┐
        │   Error:    │
        │  No converge│
        └─────────────┘
```

## Commitment Condition Evaluation

### Single-User Condition

```
┌────────────────────────────────────────┐
│  Condition: "If Alice does >= 5 hours" │
└──────────────┬─────────────────────────┘
               │
  ┌────────────▼─────────────┐
  │  Get Alice's liability   │
  │  for the action          │
  └────────────┬─────────────┘
               │
  ┌────────────▼─────────────┐
  │  liability >= 5 hours?   │
  └────┬──────────────┬──────┘
       │              │
    Yes│           No │
       │              │
  ┌────▼────┐    ┌───▼────┐
  │  TRUE   │    │  FALSE │
  └─────────┘    └────────┘
```

### Aggregate Condition

```
┌────────────────────────────────────────┐
│ Condition: "If others do >= 10 hours"  │
└──────────────┬─────────────────────────┘
               │
  ┌────────────▼─────────────┐
  │  Sum all users'          │
  │  liabilities for action  │
  └────────────┬─────────────┘
               │
  ┌────────────▼─────────────┐
  │  total >= 10 hours?      │
  └────┬──────────────┬──────┘
       │              │
    Yes│           No │
       │              │
  ┌────▼────┐    ┌───▼────┐
  │  TRUE   │    │  FALSE │
  └─────────┘    └────────┘
```

## Database Schema Relationships

```
┌─────────────┐
│    User     │
│─────────────│
│ id (PK)     │◄──────────┐
│ username    │            │
│ email       │            │
│ passwordHash│            │
└─────────────┘            │
       │                   │
       │ 1                 │
       │                   │
       │ *                 │
       │              ┌────┴────────┐
       │              │   Group     │
       │              │─────────────│
       │              │ id (PK)     │
       │              │ name        │
       │              │ description │
       │              │ creatorId(FK)│
       │              └────┬────────┘
       │                   │
       │                   │ 1
       │                   │
       │ *                 │ *
       │              ┌────▼────────────┐
       └──────────────┤ GroupMembership │
                      │─────────────────│
                      │ id (PK)         │
       ┌──────────────┤ groupId (FK)    │
       │              │ userId (FK)     │
       │              │ role            │
       │              └─────────────────┘
       │
       │ 1
       │
       │ *
  ┌────▼──────────┐
  │  Commitment   │
  │───────────────│
  │ id (PK)       │
  │ groupId (FK)  │
  │ creatorId(FK) │
  │ status        │
  │ conditionType │
  │ parsed...     │
  └───────────────┘
       │
       │ 1
       │
       │ *
  ┌────▼──────────┐
  │   Liability   │
  │───────────────│
  │ id (PK)       │
  │ groupId (FK)  │
  │ userId (FK)   │
  │ action        │
  │ amount        │
  │ unit          │
  └───────────────┘
```

## User Flow: Complete Workflow

```
1. Registration/Login
   ┌──────┐   Register/Login   ┌──────────┐
   │ User │────────────────────│  System  │
   └──────┘                     └──────────┘
       │                              │
       │◄─────── JWT Token ───────────┤
       │                              │

2. Create/Join Group
   │                              │
   │─── Create Group "Team" ─────▶│
   │◄────── Group Created ─────────┤
   │                              │
   │─── Invite Members ───────────▶│
   │◄───── Invites Sent ───────────┤
   │                              │

3. Make Commitment
   │                              │
   │─── "If Alice does 5 hours,  │
   │     I'll do 3 hours" ────────▶│
   │                              │
   │◄───── Parsed Commitment ──────┤
   │                              │
   │─── Confirm ──────────────────▶│
   │                              │
   │◄───── Commitment Saved ───────┤
   │                              │

4. View Liabilities
   │                              │
   │─── Get Liabilities ──────────▶│
   │                              │
   │         Calculate            │
   │         Fixed-point          │
   │                              │
   │◄───── Liabilities List ───────┤
   │     You: 3 hours of work     │
   │     Alice: 5 hours of work   │
   │                              │

5. Update/Revoke
   │                              │
   │─── Revoke Commitment ────────▶│
   │                              │
   │◄───── Commitment Revoked ─────┤
   │                              │
   │         Recalculate          │
   │                              │
   │◄───── Updated Liabilities ────┤
   │                              │
```

## Technology Stack Layers

```
┌──────────────────────────────────────────────┐
│            Presentation Layer                │
│  React, Material-UI, React Router            │
└───────────────┬──────────────────────────────┘
                │
┌───────────────▼──────────────────────────────┐
│          Application Layer                   │
│  Express.js, TypeScript, JWT Auth            │
└───────────────┬──────────────────────────────┘
                │
┌───────────────▼──────────────────────────────┐
│           Business Logic                     │
│  Liability Calculator, NLP Parser            │
└───────────────┬──────────────────────────────┘
                │
┌───────────────▼──────────────────────────────┐
│          Data Access Layer                   │
│  Prisma ORM                                  │
└───────────────┬──────────────────────────────┘
                │
┌───────────────▼──────────────────────────────┐
│          Database Layer                      │
│  PostgreSQL                                  │
└──────────────────────────────────────────────┘
```

## Deployment Architecture

```
┌────────────────────────────────────────────────┐
│              Load Balancer / CDN               │
└──────────────────┬─────────────────────────────┘
                   │
     ┌─────────────┴─────────────┐
     │                           │
┌────▼──────────┐      ┌─────────▼────────┐
│   Frontend    │      │     Backend      │
│   Container   │      │    Container     │
│   (React)     │      │   (Express)      │
└───────────────┘      └─────────┬────────┘
                                 │
                       ┌─────────▼────────┐
                       │   PostgreSQL     │
                       │    Database      │
                       └──────────────────┘
```
