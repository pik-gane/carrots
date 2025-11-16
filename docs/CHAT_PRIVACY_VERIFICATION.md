# Chat Window - Privacy Verification

## Current Implementation Status

✅ **Private messages are correctly filtered** - Other users CANNOT see private communications between the LLM and a specific user.

## How Privacy Works

### Backend Filtering (routes/messages.ts)
```typescript
// GET /api/messages - Lines 140-146
const whereClause = {
  groupId,
  OR: [
    { isPrivate: false },                    // Public messages (all users)
    { isPrivate: true, targetUserId: userId }, // Private TO this user
    { isPrivate: true, userId: userId },      // Private FROM this user
  ],
};
```

This query ensures:
- Each user only receives messages that are public OR specifically for them
- Private messages between LLM and User A are NOT returned to User B, C, etc.

### Private Message Creation (routes/messages.ts)
```typescript
// Clarification request - Lines 215-227
await prisma.message.create({
  data: {
    groupId,
    userId: null,              // System message
    type: 'clarification_request',
    content: detectionResult.clarificationQuestion,
    isPrivate: true,           // PRIVATE flag
    targetUserId: userId,      // Only for this specific user
    metadata: {
      originalMessageId: messageId,
    },
  },
});
```

## Visual Example

### User A's View (receives clarification)
```
┌────────────────────────────────────────────────────┐
│ 👤 Alice: "I'll help if someone does something"   │
│ [Public message - everyone sees this]             │
└────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ 🔒 System (Private) [Clarification Needed]        │
│ Could you clarify who needs to do what?           │
│ [PRIVATE - Only Alice sees this]                  │
└────────────────────────────────────────────────────┘
```

### User B's View (in same group)
```
┌────────────────────────────────────────────────────┐
│ 👤 Alice: "I'll help if someone does something"   │
│ [Public message - everyone sees this]             │
└────────────────────────────────────────────────────┘

[NO private message visible - User B cannot see 
 the clarification request sent to Alice]
```

## Frontend Display (ChatWindow.tsx)

Private messages are rendered with:
- Yellow/warning background color
- "(Private)" label
- "Clarification Needed" chip
- Border highlight

```tsx
// Lines 141-177
if (isPrivate) {
  return (
    <Paper
      sx={{
        bgcolor: 'warning.light',     // Yellow background
        borderLeft: '4px solid',
        borderLeftColor: 'warning.main',
      }}
    >
      <Typography variant="caption" fontWeight="bold">
        {message.user?.username || 'System'} (Private)
      </Typography>
      {message.type === 'clarification_request' && (
        <Chip label="Clarification Needed" size="small" color="warning" />
      )}
      <Typography variant="body2">
        {message.content}
      </Typography>
    </Paper>
  );
}
```

## Test Scenario

1. **Alice** sends: "I'll help if someone does something"
   - Everyone in group sees this public message

2. **System** detects ambiguity and sends private clarification to Alice:
   - Message created with `isPrivate: true, targetUserId: alice.id`
   - Only **Alice** sees this in her chat window
   - **Bob, Carol, David** (other group members) do NOT see this

3. **Alice** responds: "If Bob does 5h work, I'll do 3h"
   - This is a public message (all group members see it)
   - System processes and creates commitment

4. **System** posts commitment confirmation:
   - Public message (everyone sees)
   - "📝 New commitment detected..."

## Privacy Guarantee

✅ Private messages have three layers of protection:
1. **Database**: `isPrivate: true` flag
2. **Backend**: Query filters by `targetUserId`
3. **Frontend**: Only displays messages returned by API

Other users physically cannot see private messages - they are filtered out before being sent to their client.
