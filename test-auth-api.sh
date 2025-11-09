#!/bin/bash

# Simple script to test the authentication API
# Make sure the backend server is running (npm run dev in backend/)

API_URL="http://localhost:3001/api/auth"

echo "=== Testing Carrots Authentication API ==="
echo ""

# Test 1: Register a new user
echo "1. Registering a new user..."
REGISTER_RESPONSE=$(curl -s -X POST ${API_URL}/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123"
  }')

echo "Response:"
echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

# Extract access token from response
ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken' 2>/dev/null)
REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.refreshToken' 2>/dev/null)

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Registration failed. User might already exist. Try login instead:"
  echo ""
  
  # Try login if registration failed
  echo "2. Logging in..."
  LOGIN_RESPONSE=$(curl -s -X POST ${API_URL}/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "Password123"
    }')
  
  echo "Response:"
  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
  echo ""
  
  ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken' 2>/dev/null)
  REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refreshToken' 2>/dev/null)
fi

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get access token. Is the server running?"
  exit 1
fi

echo "✅ Got access token!"
echo ""

# Test 2: Get current user info
echo "3. Getting current user info..."
ME_RESPONSE=$(curl -s -X GET ${API_URL}/me \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "Response:"
echo "$ME_RESPONSE" | jq '.' 2>/dev/null || echo "$ME_RESPONSE"
echo ""

# Test 3: Refresh token
echo "4. Refreshing token..."
REFRESH_RESPONSE=$(curl -s -X POST ${API_URL}/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"${REFRESH_TOKEN}\"
  }")

echo "Response:"
echo "$REFRESH_RESPONSE" | jq '.' 2>/dev/null || echo "$REFRESH_RESPONSE"
echo ""

# Test 4: Logout
echo "5. Logging out..."
LOGOUT_RESPONSE=$(curl -s -X POST ${API_URL}/logout \
  -H "Authorization: Bearer ${ACCESS_TOKEN}")

echo "Response:"
echo "$LOGOUT_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGOUT_RESPONSE"
echo ""

echo "=== All tests completed ==="
echo ""
echo "Note: If you see 'command not found: jq', install jq for prettier output:"
echo "  - Ubuntu/Debian: sudo apt-get install jq"
echo "  - macOS: brew install jq"
