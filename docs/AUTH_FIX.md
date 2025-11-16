# Authentication Fix for Messages API

## Issue
User reported: "No authorization header provided" error on the chat page.

## Root Cause
The `messages.ts` API file was using raw `axios` directly instead of the configured `apiClient` from `client.ts`. This bypassed the request interceptor that automatically adds the JWT token to all API requests.

## Comparison

### Other API Files (Correct Pattern)
```typescript
// groups.ts, commitments.ts, auth.ts - All use apiClient
import { apiClient } from './client';

export const groupsApi = {
  create: async (data) => {
    const response = await apiClient.post('/api/groups', data);
    return response.data.group;
  },
};
```

### Messages API (Before Fix - Incorrect)
```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const messagesApi = {
  send: async (groupId, content) => {
    const response = await axios.post(
      `${API_URL}/api/messages`,
      { groupId, content },
      { withCredentials: true } // Missing: Authorization header
    );
    return response.data.message;
  },
};
```

### Messages API (After Fix - Correct)
```typescript
import { apiClient } from './client';

export const messagesApi = {
  send: async (groupId, content) => {
    const response = await apiClient.post(
      '/api/messages',
      { groupId, content }
    );
    return response.data.message;
  },
};
```

## How apiClient Works

The `apiClient` in `client.ts` includes a request interceptor:

```typescript
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  }
);
```

This interceptor:
1. Retrieves the JWT token from localStorage
2. Adds it to the Authorization header as `Bearer {token}`
3. Automatically applies to all requests made through apiClient

## Fix Applied
- **File**: `frontend/src/api/messages.ts`
- **Commit**: dae13e1
- **Changes**:
  - Replaced `import axios` with `import { apiClient }`
  - Removed `const API_URL` (no longer needed)
  - Changed `axios.post()` to `apiClient.post()`
  - Changed `axios.get()` to `apiClient.get()`
  - Removed `withCredentials: true` (not needed with apiClient)
  - Updated paths from full URLs to relative paths

## Result
✅ Messages API now includes Authorization header in all requests  
✅ Chat page works correctly with authentication  
✅ Consistent with all other API modules in the application

## Prevention
All API files should follow this pattern:
1. Import `apiClient` from `./client`
2. Use relative paths (e.g., `/api/messages` not full URL)
3. Let the interceptor handle authentication automatically
4. Never use raw `axios` for authenticated endpoints
