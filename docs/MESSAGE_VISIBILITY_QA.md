# Message Visibility Design - Q&A

## User Questions Addressed

### Q1: Are liability changes reported in chat when triggered by commitment changes outside chat?

**Answer**: ✅ YES (as of commit 86305df)

Liability notifications are now posted to the group chat whenever liabilities change, regardless of how the commitment was created or modified:

- ✅ Commitment created via chat → Liability notification in chat
- ✅ Commitment created via API/form → Liability notification in chat
- ✅ Commitment updated via API → Liability notification in chat
- ✅ Commitment revoked via API → Liability notification in chat

**Implementation**: Created `liabilityNotificationService` that is called from all commitment endpoints (create, update, revoke).

---

### Q2: Are liabilities reported to the group, not privately?

**Answer**: ✅ YES - This was already correct in the original implementation

Liability notifications are **always public** (visible to all group members):
- Type: `system_liability`
- `isPrivate: false`
- Posted to group chat for everyone to see

Example message:
```
⚖️ Liability Update:

• New: work - 3 hours
• support increased from 0 to 2 hours
```

---

### Q3: Is it clear whether users are sending private or public messages?

**Answer**: ✅ YES (as of commit 06edbd6)

**Added visual indicator**:
- Label above message input: "👥 Sending to group (visible to all members)"
- Clear icon (👥) indicating group visibility
- Prevents accidental public messages

**Current Design**:
- **All user-typed messages are PUBLIC** - sent to entire group
- **Users cannot send private messages** - they can only send to the group
- **Only the system sends private messages** - clarification requests from LLM

**Message Flow**:
```
User types message
    ↓
Message is PUBLIC (sent to group)
    ↓
LLM analyzes in background
    ↓
If clarification needed:
    System sends PRIVATE message to user
    (Only user and system can see it)
```

**Re: Should LLM move messages to the right channel?**

Current design doesn't need this because:
1. Users can only send public messages (no choice to make)
2. Private messages are system-initiated only
3. Visual indicator makes it clear all messages are public

**If we wanted to support user-initiated private responses**:
- Could add a "Reply privately" button on clarification requests
- But this adds complexity - recommend keeping current simple design

---

## Visual Examples

### Public Message Input (Current)
```
┌─────────────────────────────────────────────┐
│ 👥 Sending to group (visible to all)       │
│ ┌─────────────────────────────────────────┐│
│ │ Type a message...                       ││
│ │                                         ││
│ └─────────────────────────────────────────┘│
│                                [Send Button]│
└─────────────────────────────────────────────┘
```

### Private Clarification (System → User)
```
┌──────────────────────────────────────────┐
│ 🔒 PRIVATE MESSAGE (only you can see)   │
│ Could you clarify who needs to do work  │
│ and how much you'll contribute?         │
└──────────────────────────────────────────┘
```

### Liability Notification (Public to Group)
```
┌──────────────────────────────────────────┐
│ ⚖️ SYSTEM MESSAGE                        │
│ Liability Update:                        │
│                                          │
│ • New: work - 3 hours                   │
│ • support increased from 0 to 2 hours   │
└──────────────────────────────────────────┘
```

---

## Summary

✅ Liability notifications work for ALL commitment changes (not just chat)  
✅ Liability notifications are PUBLIC (visible to all group members)  
✅ Clear visual indicator shows messages are sent to the group  
✅ Simple design: users send public messages, system sends private clarifications  
✅ No risk of accidental private/public message confusion
