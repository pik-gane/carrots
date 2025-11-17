# Split Chat Panes and Debug Mode Implementation

## Overview
This document describes the implementation of two major UI improvements:
1. **Debug Mode**: Shows expandable LLM prompt/response pairs for each message
2. **Split Chat Panes**: Separates public and private messages into distinct panes

## Architecture

### Backend Changes

#### Message Metadata Structure
Messages now include debug information in their metadata:
```typescript
{
  debug?: {
    prompt: string;      // Full prompt sent to LLM
    response: string;    // Raw response from LLM  
    provider: string;    // LLM provider used (openai/anthropic/ollama)
    timestamp: string;   // When LLM was called
  },
  // ... other metadata fields
}
```

#### LLM Service Updates
- `detectCommitmentInMessage()` always captures debug info
- Debug info stored in message metadata when creating system messages
- Clarification requests include full LLM context

### Frontend Changes

#### ChatWindow Component Structure
```
<ChatWindow>
  ├── Header
  │   ├── Group Name
  │   ├── Debug Mode Toggle
  │   └── View Selector (Desktop: Split | Mobile: Tabs)
  │
  ├── Desktop Layout (≥768px)
  │   ├── Public Pane (Left 60%)
  │   │   ├── User messages
  │   │   ├── System commitment messages
  │   │   ├── System liability messages
  │   │   └── [Debug accordions when enabled]
  │   │
  │   └── Private Pane (Right 40%)
  │       ├── Clarification requests
  │       ├── Clarification responses
  │       └── [Debug accordions when enabled]
  │
  └── Mobile Layout (<768px)
      └── Tabs
          ├── Public Tab
          │   └── [Same as public pane]
          └── Private Tab (with badge count)
              └── [Same as private pane]
```

#### Debug Mode Features
- Toggle in header: "🐛 Debug Mode"
- When enabled, each message shows expandable accordion below it
- Accordion contains:
  - Provider badge (OpenAI/Anthropic/Ollama)
  - Timestamp
  - Prompt (formatted, syntax highlighted)
  - Response (formatted, syntax highlighted)
- Only visible when debug data exists in metadata
- Persists across page reloads (localStorage)

#### Split Pane Features

**Public Pane:**
- All user-sent messages
- System commitment detection messages
- System liability update messages  
- Message input at bottom
- Labeled: "👥 Group Chat"

**Private Pane:**
- Clarification request messages from system
- Clarification response messages from user
- "Reply Privately" UI integrated
- Labeled: "🔒 Private Clarifications"
- Badge shows count of unread private messages

**Responsive Behavior:**
- **Desktop (≥768px)**: Side-by-side panes with resizable divider
- **Tablet (≥640px)**: Stacked view with private pane collapsible
- **Mobile (<640px)**: Tab-based navigation with badges

## Implementation Files

### Backend
- `/backend/src/services/llmService.ts` - Enhanced to always capture debug info
- `/backend/src/routes/messages.ts` - Store debug in metadata when creating messages

### Frontend
- `/frontend/src/components/ChatWindow.tsx` - Complete rewrite with split panes
- `/frontend/src/components/DebugAccordion.tsx` - New component for debug display
- `/frontend/src/components/ChatPane.tsx` - Reusable pane component

## User Experience

### Debug Mode Workflow
1. Developer clicks "🐛 Debug Mode" toggle in header
2. All messages with LLM interaction show expandable section
3. Click to expand and see full prompt/response
4. Useful for understanding why LLM made certain decisions
5. Great for troubleshooting clarification loops

### Split Pane Workflow

**Desktop:**
1. User sees public chat on left (main conversation)
2. Private clarifications appear on right when LLM needs info
3. User can type in either pane
4. Both panes scroll independently
5. Clear visual separation prevents confusion

**Mobile:**
1. User starts in "Public" tab (default view)
2. Badge on "Private" tab shows when clarifications needed
3. Tap to switch to private tab
4. Reply privately to clarification
5. System processes and returns to public for commitment

## Benefits

### Debug Mode Benefits
- **Transparency**: See exactly what LLM receives and returns
- **Debugging**: Understand why commitments aren't detected
- **Learning**: Users can learn how to phrase commitments better
- **Trust**: Builds confidence in LLM processing

### Split Pane Benefits
- **Clarity**: No more cluttered group chat
- **Context**: Private clarifications don't confuse other members
- **Focus**: Users can see conversation flow clearly
- **Privacy**: Visual separation reinforces private nature
- **Efficiency**: No scrolling to find clarifications in main chat

## Testing Scenarios

### Debug Mode Tests
1. Send message, check debug accordion appears
2. Expand accordion, verify prompt/response shown
3. Toggle debug mode off, verify accordions hidden
4. Refresh page, verify debug mode persists
5. Check different message types (user, system, clarification)

### Split Pane Tests
1. Desktop: Verify panes side-by-side
2. Mobile: Verify tabs switch correctly
3. Send public message, appears in left/public pane
4. Receive clarification, appears in right/private pane
5. Badge count increments with new private messages
6. Reply privately, message appears in private pane
7. Resize window, verify responsive breakpoints work

## Future Enhancements
- Export debug logs as JSON for analysis
- Search/filter within debug info
- Syntax highlighting for JSON in debug view
- Private pane collapsible on desktop
- Drag-to-resize pane divider
- Notification sound for private messages
- Read/unread status for private messages
