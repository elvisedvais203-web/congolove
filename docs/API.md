# NexTalk API Documentation

Base URL: `/api`

## Authentication

### Login & Auth
```
POST /auth/firebase/verify
POST /auth/refresh
```

---

## Username & Discovery

### Username Management
```
POST /api/username/check-availability
  - Check if username is available
  - Body: { username: string }
  - Response: { available: boolean, username: string }

POST /api/username/claim
  - Claim username for current user
  - Auth Required ✓
  - Body: { username: string }
  - Response: { message: string, username: string }

GET /api/username/:username
  - Get public profile by username
  - Response: { id, username, profile, followerCount, reputation }

GET /api/username/search?q=query&limit=10
  - Search usernames with autocomplete
  - Response: { query, count, results[] }
```

---

## Contacts Management

### Contact Operations
```
POST /api/contacts/import
  - Import contacts from phone numbers
  - Auth Required ✓, CSRF Protected ✓
  - Body: { phoneNumbers: string[] }
  - Response: { message, count, contacts[] }

POST /api/contacts/add
  - Add a single contact
  - Auth Required ✓, CSRF Protected ✓
  - Body: { contactUserId: string, displayName?: string }
  - Response: { message, contact }

DELETE /api/contacts/:contactUserId
  - Remove a contact
  - Auth Required ✓, CSRF Protected ✓

GET /api/contacts/list?includeBlocked=false
  - Get all contacts
  - Auth Required ✓

POST /api/contacts/:contactUserId/favorite
  - Set contact as favorite
  - Auth Required ✓, CSRF Protected ✓
  - Body: { isFavorite: boolean }

GET /api/contacts/favorites
  - Get favorite contacts
  - Auth Required ✓

GET /api/contacts/search?q=query
  - Search contacts by name/username
  - Auth Required ✓

POST /api/contacts/:contactUserId/block
  - Block a contact
  - Auth Required ✓, CSRF Protected ✓
  - Body: { reason?: string }

DELETE /api/contacts/:contactUserId/block
  - Unblock a contact
  - Auth Required ✓, CSRF Protected ✓

GET /api/contacts/blocked-users
  - Get list of blocked users
  - Auth Required ✓
```

---

## Privacy Settings

### Privacy Management
```
GET /api/privacy/settings
  - Get user's privacy settings
  - Auth Required ✓
  - Response: { privacyMode, profile }

PUT /api/privacy/mode
  - Update privacy mode
  - Auth Required ✓, CSRF Protected ✓
  - Body: { privacyMode: "PUBLIC" | "PRIVATE" | "SEMI_PRIVATE" }

GET /api/privacy/profile-visible/:userId
  - Check if profile is visible to viewer
  - Auth Required ✓

GET /api/privacy/story-visible/:storyOwnerId?storyVisibility=PUBLIC|FOLLOWERS
  - Check if story is visible
  - Auth Required ✓

POST /api/privacy/can-message
  - Check if user can message another user
  - Auth Required ✓
  - Body: { recipientId: string }
  - Response: { canMessage: boolean, reason?: string }

GET /api/privacy/visible-profiles?limit=20
  - Get profiles visible to current user
  - Auth Required ✓
```

---

## Matching & Discovery

### User Matching
```
GET /matching/discover?limit=20
  - Get users to discover
  - Respects privacy settings
  - Response: { users[] }

POST /matching/swipe
  - Like/Pass on user
  - Body: { targetUserId, action: "LIKE"|"PASS" }

GET /matching/compatibility/:targetUserId
  - Get compatibility score
```

---

## Messaging

### Direct Messages (Legacy - being replaced by Chat)
```
GET /messages?matchId={id}&page=1&take=20
  - Get messages
  
POST /messages
  - Send message
```

### Chat System
```
GET /chats/conversations
  - Get all conversations
  - Auth Required ✓

GET /chats/groups
  - Get all groups
  - Auth Required ✓

GET /chats/:chatId/messages?page=1&take=50
  - Get messages in chat/group
  - Auth Required ✓
  - Includes message status (SENT, DELIVERED, SEEN)

GET /chats/:chatId/search?q=...
  - Search messages in chat
  - Auth Required ✓

POST /chats/:chatId/messages
  - Send message to chat
  - Auth Required ✓, CSRF Protected ✓, Rate Limited ✓
  - Body: { type: TEXT|IMAGE|VIDEO|VOICE|STICKER, text?, mediaUrl?, fileName? }
  - Response includes status: SENT

POST /chats/:chatId/read
  - Mark chat as read
  - Auth Required ✓, CSRF Protected ✓

POST /chats/:chatId/archive
  - Archive/unarchive conversation
  - Auth Required ✓, CSRF Protected ✓

PATCH /chats/messages/:messageId
  - Edit message
  - Auth Required ✓, CSRF Protected ✓

DELETE /chats/messages/:messageId
  - Delete message
  - Auth Required ✓, CSRF Protected ✓

POST /chats/messages/:messageId/reactions
  - React to message (emoji)
  - Auth Required ✓, CSRF Protected ✓
  - Body: { emoji: string }

POST /chats/groups
  - Create group chat
  - Auth Required ✓, CSRF Protected ✓
  - Body: { title, memberIds[] }

POST /chats/groups/:chatId/members
  - Add member to group
  - Auth Required ✓, CSRF Protected ✓

DELETE /chats/groups/:chatId/members/:memberId
  - Remove member from group
  - Auth Required ✓, CSRF Protected ✓

POST /chats/maintenance/clear-all
  - Clear all conversations
  - Auth Required ✓, CSRF Protected ✓

DELETE /chats/maintenance/delete-all
  - Delete all conversations
  - Auth Required ✓, CSRF Protected ✓
```

---

## User Profile

### Profile Management
```
GET /profile/me
  - Get current user profile
  - Auth Required ✓
  - Response includes: username, privacy, profile data

PATCH /profile/me
  - Update profile
  - Auth Required ✓, CSRF Protected ✓
  - Body: { displayName?, bio?, city?, interests[]?, privacyMode? }

DELETE /profile/me
  - Delete account
  - Auth Required ✓, CSRF Protected ✓
```

---

## Stories

### Story Management
```
GET /stories
  - Get visible stories
  - Auth Required ✓
  - Respects privacy settings

POST /stories
  - Create story
  - Auth Required ✓, CSRF Protected ✓
  - Body: { mediaUrl, mediaType, caption?, visibility }

GET /stories/:storyId/viewers
  - Get story viewers
  - Auth Required ✓

DELETE /stories/:storyId
  - Delete story
  - Auth Required ✓, CSRF Protected ✓
```

---

## Social Features

### Follow & Social
```
POST /social/follow/:userId
  - Follow user
  - Auth Required ✓, CSRF Protected ✓

DELETE /social/follow/:userId
  - Unfollow user
  - Auth Required ✓, CSRF Protected ✓

GET /social/followers
  - Get followers list
  - Auth Required ✓

GET /social/following
  - Get following list
  - Auth Required ✓

POST /social/feed
  - Create feed post
  - Auth Required ✓, CSRF Protected ✓

GET /social/feed
  - Get feed
  - Auth Required ✓
```

---

## Payments

### Payment Processing
```
POST /payments/premium
  - Create premium subscription
  - Auth Required ✓, CSRF Protected ✓
  - Body: { provider: "AIRTEL"|"ORANGE"|"MPESA", amount }

POST /webhooks/payments
  - Payment provider webhook
  - Internal only

GET /payments/status
  - Get payment status
  - Auth Required ✓
```

---

## Moderation

### Reporting & Safety
```
POST /moderation/report
  - Report user
  - Auth Required ✓, CSRF Protected ✓
  - Body: { reportedUserId, reason }

POST /moderation/appeal
  - Appeal restriction
  - Body: { userId, appeal }

GET /moderation/admin/stats
  - Get moderation stats
  - Auth Required ✓, Admin Required ✓

GET /moderation/admin/users
  - Get user list (admin)
  - Auth Required ✓, Admin Required ✓

POST /moderation/admin/users/:userId/restriction
  - Update account restriction
  - Auth Required ✓, Admin Required ✓, CSRF Protected ✓

GET /moderation/admin/restrictions
  - Get restrictions list
  - Auth Required ✓, Admin Required ✓
```

---

## Security

### Security & Sessions
```
GET /security/csrf-token
  - Get CSRF token
  - Required for mutations

POST /security/session
  - Get session info
  - Auth Required ✓
```

---

## Media Upload

### File Management
```
POST /media/upload
  - Upload media (image/video/file)
  - Auth Required ✓, CSRF Protected ✓
  - Form Data: { file }
  - Response: { url, type, size }
```

---

## Presence

### Online Status
```
GET /presence/status/:userId
  - Get user's online status
  - Auth Required ✓
  - Response: { status: "online"|"away"|"offline", lastSeen }

POST /presence/heartbeat
  - Update presence (WebSocket also available)
  - Auth Required ✓
```

---

## Search

### General Search
```
GET /search/users?q=query&limit=20
  - Search users
  - Query supports: @username, display name
  - Response: { query, count, results[] }

GET /search/trending
  - Get trending users
  - Response: { users[] }

GET /search/suggestions?interests[]=tag1&interests[]=tag2
  - Get suggested users by interests
  - Response: { suggestions[] }
```

---

## AI Features

### AI Assistance
```
POST /ai/recommendations
  - Get user recommendations
  - Auth Required ✓
  - Body: { limit? }

POST /ai/icebreakers
  - Get conversation starters
  - Auth Required ✓
  - Body: { targetUserId }

POST /ai/preferences
  - Update AI preferences
  - Auth Required ✓, CSRF Protected ✓
```

---

## Notifications

### Push Notifications
```
POST /notifications/subscribe
  - Subscribe to push notifications
  - Auth Required ✓
  - Body: { endpoint, auth, p256dh }

GET /notifications
  - Get notifications
  - Auth Required ✓

DELETE /notifications/:notificationId
  - Mark as read
  - Auth Required ✓
```

---

## System Health

### Status & Monitoring
```
GET /health
  - Basic health check
  - Response: { ok: boolean, service, uptimeSec, timestamp }

GET /ready
  - Readiness check
  - Response: { ok, checks: { database, redis }, timestamp }
```

---

## Error Responses

### Standard Error Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "status": 400
  }
}
```

### Common Status Codes
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (CSRF, role-based)
- `404` - Not Found
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

---

## Authentication

### Headers Required
```
Authorization: Bearer {JWT_TOKEN}
X-CSRF-Token: {CSRF_TOKEN}  (for mutations)
Content-Type: application/json
```

### Response Format
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "expires_in": 3600
}
```

---

## Rate Limiting

Applied per user:
- General API: 100 requests/minute
- Auth: 5 attempts/minute
- Chat messages: 30 messages/minute
- Media upload: 10 uploads/minute

---

## Changelog

### Version 1.1 (Phase 1)
- Added username system and discovery
- Added contact management
- Added privacy modes (PUBLIC, PRIVATE, SEMI_PRIVATE)
- Added user blocking system
- Enhanced search with username priority
- Added message status tracking (SENT, DELIVERED, SEEN)
- Added enhanced user discovery APIs
- Updated all documentation

---

**Last Updated**: April 21, 2025  
**API Version**: 1.1  
**Status**: Production Ready ✓

## Socket.io events
- join_match
- send_message
- new_message
- message_error
