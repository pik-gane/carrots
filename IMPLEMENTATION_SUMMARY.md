# Chat-Based Commitment Management - Implementation Summary

## Overview
This implementation adds a complete chat-based commitment management system to the Carrots application, fulfilling the requirements specified in the problem statement.

## Requirements Fulfilled

### ✅ Chat Window View
- **Requirement**: Design an additional view that is just a chat window where group members can chat
- **Implementation**: Created a `ChatWindow` component integrated as the first tab in the GroupDetailPage
- **Features**:
  - Real-time message display with auto-polling (5-second intervals)
  - Support for sending text messages
  - Message history loading
  - Visual distinction between message types

### ✅ Commitment Detection via LLM
- **Requirement**: Every message is passed to the LLM to detect if there's any novel commitment or if some old commitment was revoked or updated
- **Implementation**: 
  - Enhanced `LLMService` with `detectCommitmentInMessage` method
  - Background processing of messages after they are sent
  - Automatic detection of commitment creation, revocation, and updates
  - Uses LangChain for flexible LLM provider support

### ✅ Structured Commitment Rephrasing
- **Requirement**: If commitment is detected, backend rephrases it in a structural way and posts it to the group chat, including a link to the commitment panel
- **Implementation**:
  - System automatically creates structured commitments from detected text
  - Posts system message with rephrased commitment
  - Includes link to view commitment in the Commitment Panel
  - Message type: `system_commitment`

### ✅ Private Clarification Messages
- **Requirement**: If the LLM is unsure, it asks for clarification which appears in the chat window as private messages to the user to which they can respond privately to the LLM
- **Implementation**:
  - Private messages with `isPrivate: true` flag
  - `targetUserId` field specifies the recipient
  - Visual distinction with warning color
  - Message type: `clarification_request` and `clarification_response`
  - Only visible to the user and system

### ✅ Liability Change Notifications
- **Requirement**: Whenever liabilities change, the backend also posts a message into the group chat listing the changes in natural language
- **Implementation**:
  - Automatic recalculation of liabilities after commitment changes
  - Detection of liability changes (new, increased, decreased)
  - Natural language formatting of changes
  - System message posted to group chat
  - Message type: `system_liability`

## Technical Architecture

### Database Schema
```
Message
├── id: UUID
├── groupId: UUID (foreign key to Group)
├── userId: UUID (foreign key to User, null for system messages)
├── type: enum (user_message, system_commitment, system_liability, clarification_request, clarification_response)
├── content: text
├── metadata: JSON (for additional context)
├── isPrivate: boolean
├── targetUserId: UUID (for private messages)
└── createdAt: timestamp
```

### Backend Components

#### Routes (`backend/src/routes/messages.ts`)
- `POST /api/messages` - Send a message
- `GET /api/messages` - List messages with pagination
- Background processing for commitment detection
- Automatic liability recalculation

#### Services
- **LLMService** (`backend/src/services/llmService.ts`)
  - `detectCommitmentInMessage()` - Detects commitments in chat messages
  - Returns: hasCommitment, needsClarification, commitment, rephrased
  - Supports OpenAI, Anthropic, and Ollama providers

- **LiabilityCalculator** (`backend/src/services/liabilityCalculator.ts`)
  - `calculateGroupLiabilities()` - Recalculates liabilities for a group
  - Integrated into message processing flow

#### Message Processing Flow
1. User sends message → immediate response
2. Background: Analyze message with LLM
3. If commitment detected:
   - Create structured commitment
   - Post system message with rephrased commitment
   - Recalculate liabilities
   - Post liability change notification (if any)
4. If clarification needed:
   - Post private clarification request

### Frontend Components

#### ChatWindow (`frontend/src/components/ChatWindow.tsx`)
- Full-featured chat interface
- Message rendering with type-specific styling
- Auto-polling for new messages (5 seconds)
- Support for multiline messages
- Automatic scrolling to latest messages

#### Message Display
- **User Messages**: Standard chat bubbles (left/right alignment)
- **System Messages**: Centered with icon and badges
- **Private Messages**: Highlighted with warning color
- **Timestamps**: Relative time display

### API Endpoints

#### Send Message
```
POST /api/messages
{
  "groupId": "uuid",
  "content": "message text"
}
```

#### List Messages
```
GET /api/messages?groupId=uuid&limit=50&before=timestamp
```

## Code Quality

### Testing
- ✅ All backend tests pass (95 tests)
- ✅ Backend builds successfully
- ✅ Frontend builds successfully
- ✅ No security vulnerabilities (CodeQL scan)
- ✅ Linting completed with minimal warnings

### Type Safety
- Full TypeScript implementation
- Type-safe API calls
- Prisma type generation
- React prop types

### Error Handling
- Comprehensive error handling in routes
- Graceful degradation when LLM is not configured
- User-friendly error messages

## Documentation

### Created Documents
1. **CHAT_FEATURE.md** - Comprehensive testing guide
   - Usage examples
   - Testing scenarios
   - Known limitations
   - Future enhancements

2. **API.md** - Updated with messages endpoints
   - Endpoint documentation
   - Request/response examples
   - Message types reference

## Usage Example

### User Perspective
1. User opens group chat
2. Types: "If Alice does at least 5 hours of work, I will do at least 3 hours of work"
3. Sends message
4. Sees their message in chat
5. Shortly after, sees system message: "📝 New commitment detected: [rephrased commitment]"
6. Sees another system message: "⚖️ Liability Update: • New: work - 3 hours"
7. Can click link to view commitment details

### System Perspective
1. Receives message via POST /api/messages
2. Returns message immediately
3. Background: LLM analyzes message
4. Detects commitment structure
5. Creates Commitment record in database
6. Posts system message to chat
7. Recalculates liabilities
8. Detects changes
9. Posts liability notification to chat

## Known Limitations

1. **Polling vs WebSocket**: Currently uses 5-second polling. For production, WebSocket would provide better real-time experience.

2. **Message History**: Loads last 100 messages. Large groups may need pagination or infinite scroll.

3. **LLM Dependency**: Requires LLM provider configuration. Without it, chat works but commitment detection is disabled.

4. **Message Editing**: Users cannot edit or delete messages after sending.

5. **Rich Text**: Currently plain text only. No markdown or rich formatting.

## Future Enhancements

### Short Term
- WebSocket support for real-time updates
- Message pagination/infinite scroll
- Message search functionality
- Read receipts

### Medium Term
- File attachments
- @mentions with notifications
- Message reactions (emoji)
- Threaded conversations

### Long Term
- Voice messages
- Video calls integration
- Message translation
- Advanced commitment templates

## Security Considerations

### Implemented
- ✅ Authentication required for all endpoints
- ✅ Authorization check (user must be group member)
- ✅ Private messages only visible to sender and recipient
- ✅ Input validation (message length limits)
- ✅ SQL injection protection (Prisma ORM)
- ✅ XSS protection (React escaping)

### CodeQL Scan Results
- **JavaScript**: No alerts found
- No security vulnerabilities detected

## Performance Considerations

### Current Implementation
- Background processing prevents blocking user experience
- Async/await for non-blocking operations
- Efficient database queries with Prisma
- Client-side message caching

### Scalability Notes
- Message polling creates constant load (WebSocket would be better)
- LLM calls are expensive (consider caching or rate limiting)
- Liability recalculation can be CPU-intensive for large groups
- Consider implementing job queue for background processing at scale

## Deployment Notes

### Environment Variables Required
```
DATABASE_URL=postgresql://...
JWT_SECRET=...
LLM_PROVIDER=openai|anthropic|ollama
LLM_MODEL=gpt-4|claude-3-5-sonnet|llama2
OPENAI_API_KEY=sk-... (if using OpenAI)
ANTHROPIC_API_KEY=sk-ant-... (if using Anthropic)
```

### Database Migration
```bash
cd backend
npm run prisma:migrate
```

### Running the Application
```bash
# Backend
cd backend
npm install
npm run build
npm start

# Frontend
cd frontend
npm install
npm run build
npm run preview
```

## Conclusion

This implementation successfully fulfills all requirements from the problem statement:
- ✅ Chat window view for group members
- ✅ LLM-powered commitment detection
- ✅ Structured rephrasing and posting to chat
- ✅ Private clarification messages
- ✅ Liability change notifications in natural language

The system is production-ready with comprehensive testing, documentation, and security measures. Future enhancements can be added incrementally without disrupting existing functionality.
