# Chat-Based Commitment Management - Testing Guide

## Overview
This document describes how to test the new chat-based commitment management feature.

## Features Implemented

### 1. Chat Interface
- **Location**: Group Detail Page → Chat Tab (first tab)
- **Features**:
  - Real-time group chat with auto-polling (5-second intervals)
  - Support for user messages, system messages, and private messages
  - Visual distinction between different message types
  - Automatic scrolling to latest messages

### 2. Automatic Commitment Detection
- **How it works**:
  1. User sends a message in the group chat
  2. System asynchronously analyzes the message using LLM
  3. If a commitment is detected, system creates a structured commitment
  4. System posts a message to the group chat with the rephrased commitment
  5. Message includes a link to view the commitment in the Commitment Panel

- **Example Messages**:
  - "If Alice does at least 5 hours of work, I will do at least 3 hours of work"
  - "If Bob completes 10 tasks, I'll complete 5 tasks"
  - "I'll do 2 hours of support for every hour Carol does beyond 5 hours"

### 3. LLM Clarification Flow
- **When LLM is Uncertain**:
  1. System sends a private message to the user requesting clarification
  2. Private message is highlighted with a warning color
  3. User can respond to the clarification privately
  4. Only the user and system can see the private messages

- **Example Clarification**:
  - User: "If someone does work, I'll help"
  - System (private): "Could you clarify who needs to do work and how much help you'll provide?"
  - User (private): "If Alice does 5 hours of work, I'll do 3 hours of support"

### 4. Liability Change Notifications
- **How it works**:
  1. When a new commitment is created, system recalculates liabilities
  2. If liabilities change, system posts a notification to the group chat
  3. Notification lists the changes in natural language

- **Example Notification**:
  ```
  ⚖️ Liability Update:
  
  • New: work - 3 hours
  • support increased from 0 to 2 hours
  ```

## Testing Scenarios

### Scenario 1: Basic Chat Message
1. Navigate to a group's detail page
2. Click on the "Chat" tab
3. Type a regular message: "Hello everyone!"
4. Press Send
5. **Expected**: Message appears in the chat with your username and timestamp

### Scenario 2: Commitment Detection
1. In the chat, type: "If Alice does at least 5 hours of work, I will do at least 3 hours of work"
2. Press Send
3. **Expected**:
   - Your message appears in the chat
   - After a short delay (1-2 seconds), a system message appears with the rephrased commitment
   - System message includes a link to view the commitment
   - Navigate to Commitments tab to verify the commitment was created

### Scenario 3: Unclear Commitment (requires LLM)
1. In the chat, type: "I'll help if someone does something"
2. Press Send
3. **Expected**:
   - Your message appears in the chat
   - After a short delay, a private system message appears asking for clarification
   - Private message is highlighted in a different color

### Scenario 4: Liability Changes
1. Create a commitment via chat (see Scenario 2)
2. **Expected**:
   - System message about the commitment appears
   - Another system message appears showing liability changes
   - Navigate to Liabilities tab to see the updated liabilities

## API Endpoints

### Send Message
```
POST /api/messages
Body: {
  "groupId": "uuid",
  "content": "message text"
}
```

### List Messages
```
GET /api/messages?groupId=uuid&limit=50&before=timestamp
```

## Database Schema

### Message Model
```sql
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT,  -- null for system messages
    "type" TEXT NOT NULL,  -- user_message | system_commitment | system_liability | clarification_request | clarification_response
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "targetUserId" TEXT,  -- for private messages
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
```

## Known Limitations

1. **Real-time Updates**: Currently uses polling (5-second intervals). For production, consider implementing WebSocket support.

2. **LLM Dependency**: Commitment detection requires an LLM provider to be configured. Without it, messages are just chat messages without automatic detection.

3. **Message History**: Currently loads last 100 messages. For larger groups, implement pagination or infinite scroll.

4. **Private Message UI**: Private clarification messages are shown inline. Consider a separate panel or notification system.

## Future Enhancements

1. **WebSocket Support**: Replace polling with WebSocket for real-time updates
2. **Message Reactions**: Allow users to react to messages with emojis
3. **Message Threading**: Support threaded conversations for clarifications
4. **Rich Text**: Support markdown or rich text formatting in messages
5. **File Attachments**: Allow users to attach files or images
6. **Push Notifications**: Notify users of new messages when not actively viewing the chat
7. **Message Search**: Add search functionality to find specific messages or commitments
8. **Message Editing**: Allow users to edit their own messages within a time window
9. **Commitment Revocation via Chat**: Support revoking commitments through natural language messages
10. **@mentions**: Support mentioning other group members in messages
