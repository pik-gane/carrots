# API Documentation

Base URL: `http://localhost:3001/api`

## Authentication

All authenticated endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

### Register
- **POST** `/auth/register`
- **Body**:
  ```json
  {
    "username": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Response**: 201
  ```json
  {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string"
    },
    "token": "jwt-token"
  }
  ```

### Login
- **POST** `/auth/login`
- **Body**:
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response**: 200
  ```json
  {
    "user": {
      "id": "uuid",
      "username": "string",
      "email": "string"
    },
    "token": "jwt-token"
  }
  ```

### Get Current User
- **GET** `/auth/me`
- **Auth**: Required
- **Response**: 200
  ```json
  {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "createdAt": "ISO8601"
  }
  ```

## Users

### Get User
- **GET** `/users/:id`
- **Auth**: Required
- **Response**: 200
  ```json
  {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "createdAt": "ISO8601"
  }
  ```

## Groups

### Create Group
- **POST** `/groups`
- **Auth**: Required
- **Body**:
  ```json
  {
    "name": "string",
    "description": "string (optional)"
  }
  ```
- **Response**: 201
  ```json
  {
    "id": "uuid",
    "name": "string",
    "description": "string | null",
    "creatorId": "uuid",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  }
  ```

### List User's Groups
- **GET** `/groups`
- **Auth**: Required
- **Query Params**:
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
- **Response**: 200
  ```json
  {
    "groups": [
      {
        "id": "uuid",
        "name": "string",
        "description": "string | null",
        "creatorId": "uuid",
        "memberCount": number,
        "createdAt": "ISO8601"
      }
    ],
    "total": number,
    "page": number,
    "totalPages": number
  }
  ```

### Get Group
- **GET** `/groups/:id`
- **Auth**: Required
- **Response**: 200
  ```json
  {
    "id": "uuid",
    "name": "string",
    "description": "string | null",
    "creatorId": "uuid",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601",
    "members": [
      {
        "userId": "uuid",
        "username": "string",
        "email": "string",
        "role": "creator | member",
        "joinedAt": "ISO8601"
      }
    ]
  }
  ```

### Update Group
- **PUT** `/groups/:id`
- **Auth**: Required (must be creator)
- **Body**:
  ```json
  {
    "name": "string (optional)",
    "description": "string (optional)"
  }
  ```
- **Response**: 200

### Delete Group
- **DELETE** `/groups/:id`
- **Auth**: Required (must be creator)
- **Response**: 204

### Join Group
- **POST** `/groups/:id/join`
- **Auth**: Required
- **Response**: 200

### Leave Group
- **POST** `/groups/:id/leave`
- **Auth**: Required
- **Response**: 200

### Get Group Members
- **GET** `/groups/:id/members`
- **Auth**: Required
- **Response**: 200
  ```json
  {
    "members": [
      {
        "userId": "uuid",
        "username": "string",
        "email": "string",
        "role": "creator | member",
        "joinedAt": "ISO8601"
      }
    ]
  }
  ```

## Commitments

### Create Commitment
- **POST** `/commitments`
- **Auth**: Required
- **Body** (Structured):
  ```json
  {
    "groupId": "uuid",
    "conditionType": "single_user | aggregate",
    "parsedCommitment": {
      "condition": {
        "type": "single_user | aggregate",
        "targetUserId": "uuid (optional, for single_user)",
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
  ```
- **Body** (Natural Language):
  ```json
  {
    "groupId": "uuid",
    "naturalLanguageText": "If Alice does at least 5 hours of work, I will do at least 3 hours"
  }
  ```
- **Response**: 201
  ```json
  {
    "id": "uuid",
    "groupId": "uuid",
    "creatorId": "uuid",
    "status": "active",
    "conditionType": "single_user | aggregate",
    "naturalLanguageText": "string | null",
    "parsedCommitment": { ... },
    "createdAt": "ISO8601"
  }
  ```

### Parse Natural Language Commitment
- **POST** `/commitments/parse`
- **Auth**: Required
- **Body**:
  ```json
  {
    "naturalLanguageText": "string",
    "groupId": "uuid"
  }
  ```
- **Response**: 200
  ```json
  {
    "success": true,
    "parsed": {
      "condition": { ... },
      "promise": { ... }
    }
  }
  ```
  or if clarification needed:
  ```json
  {
    "success": false,
    "clarificationNeeded": "string"
  }
  ```

### List Commitments
- **GET** `/commitments`
- **Auth**: Required
- **Query Params**:
  - `groupId`: uuid (optional)
  - `userId`: uuid (optional)
  - `status`: "active" | "revoked" (optional)
  - `page`: number (default: 1)
  - `limit`: number (default: 20)
- **Response**: 200
  ```json
  {
    "commitments": [
      {
        "id": "uuid",
        "groupId": "uuid",
        "creatorId": "uuid",
        "creatorUsername": "string",
        "status": "active | revoked",
        "conditionType": "single_user | aggregate",
        "naturalLanguageText": "string | null",
        "parsedCommitment": { ... },
        "createdAt": "ISO8601",
        "updatedAt": "ISO8601"
      }
    ],
    "total": number,
    "page": number,
    "totalPages": number
  }
  ```

### Get Commitment
- **GET** `/commitments/:id`
- **Auth**: Required
- **Response**: 200

### Update Commitment
- **PUT** `/commitments/:id`
- **Auth**: Required (must be creator)
- **Body**: Same as Create Commitment
- **Response**: 200

### Revoke Commitment
- **DELETE** `/commitments/:id`
- **Auth**: Required (must be creator)
- **Response**: 200
  ```json
  {
    "id": "uuid",
    "status": "revoked",
    "revokedAt": "ISO8601"
  }
  ```

## Liabilities

### Get Group Liabilities
- **GET** `/groups/:id/liabilities`
- **Auth**: Required
- **Response**: 200
  ```json
  {
    "liabilities": [
      {
        "id": "uuid",
        "groupId": "uuid",
        "userId": "uuid",
        "username": "string",
        "action": "string",
        "amount": number,
        "unit": "string",
        "calculatedAt": "ISO8601",
        "effectiveCommitmentIds": ["uuid"]
      }
    ],
    "calculatedAt": "ISO8601"
  }
  ```

### Get User Liabilities
- **GET** `/users/:id/liabilities`
- **Auth**: Required
- **Query Params**:
  - `groupId`: uuid (optional, filter by group)
- **Response**: 200
  ```json
  {
    "liabilities": [
      {
        "id": "uuid",
        "groupId": "uuid",
        "groupName": "string",
        "action": "string",
        "amount": number,
        "unit": "string",
        "calculatedAt": "ISO8601"
      }
    ]
  }
  ```

## Error Responses

All endpoints may return error responses:

### 400 Bad Request
```json
{
  "error": "Validation error message",
  "statusCode": 400
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "statusCode": 401
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "statusCode": 403
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "statusCode": 404
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "statusCode": 500
}
```

## Messages

### Send Message
- **POST** `/messages`
- **Auth**: Required
- **Body**:
  ```json
  {
    "groupId": "uuid",
    "content": "string (1-5000 chars)"
  }
  ```
- **Response**: 201
  ```json
  {
    "message": {
      "id": "uuid",
      "groupId": "uuid",
      "userId": "uuid",
      "type": "user_message",
      "content": "string",
      "metadata": null,
      "isPrivate": false,
      "targetUserId": null,
      "createdAt": "ISO8601",
      "user": {
        "id": "uuid",
        "username": "string"
      }
    }
  }
  ```
- **Note**: After sending, the system asynchronously checks for commitments in the message. If detected, additional system messages will be created.

### List Messages
- **GET** `/messages?groupId={uuid}&limit={number}&before={ISO8601}`
- **Auth**: Required
- **Query Parameters**:
  - `groupId` (required): Group ID
  - `limit` (optional): Number of messages to return (1-100, default: 50)
  - `before` (optional): ISO timestamp for pagination
- **Response**: 200
  ```json
  {
    "messages": [
      {
        "id": "uuid",
        "groupId": "uuid",
        "userId": "uuid | null",
        "type": "user_message | system_commitment | system_liability | clarification_request | clarification_response",
        "content": "string",
        "metadata": {},
        "isPrivate": false,
        "targetUserId": "uuid | null",
        "createdAt": "ISO8601",
        "user": {
          "id": "uuid",
          "username": "string"
        } | null
      }
    ]
  }
  ```
- **Note**: 
  - System messages have `userId: null`
  - Private messages are only visible to the sender and recipient
  - Messages are returned in chronological order (oldest first)

### Message Types
- `user_message`: Regular chat message from a user
- `system_commitment`: System notification about a detected/created commitment
- `system_liability`: System notification about liability changes
- `clarification_request`: Private message from system requesting clarification
- `clarification_response`: Private message from user responding to clarification

### Automatic Commitment Detection
When a user sends a message, the system:
1. Immediately returns the message
2. Asynchronously analyzes the message for commitments using LLM
3. If a commitment is detected:
   - Creates a structured commitment
   - Posts a system message with the rephrased commitment
   - Recalculates liabilities
   - Posts a system message with liability changes (if any)
4. If clarification is needed:
   - Posts a private system message to the user

See [CHAT_FEATURE.md](./CHAT_FEATURE.md) for detailed testing guide.
