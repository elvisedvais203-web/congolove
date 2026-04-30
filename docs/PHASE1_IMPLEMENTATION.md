# NexTalk Phase 1 Implementation Guide

## Overview
This document describes the Phase 1 implementation of NexTalk, which includes:
- Username system (@username)
- Privacy modes (Public/Private/Semi-Private)
- Contact management and import
- User blocking system
- Enhanced user discovery and search
- Message status tracking (foundation)

## New Database Models

### User Model Changes
```prisma
model User {
  // New fields:
  username String? @unique
  usernameSearchLower String? @unique  // For case-insensitive search
  privacyMode PrivacyMode @default(PUBLIC)
  
  // New relations:
  contacts Contact[] @relation("ContactOwner")
  contactOf Contact[] @relation("ContactUser")
  blockedBy Block[] @relation("BlockedUser")
  blockedUsers Block[] @relation("BlockingUser")
}
```

### Profile Model Changes
```prisma
model Profile {
  // New fields:
  privacyMode PrivacyMode @default(PUBLIC)
  profileImageUrl String?
  updatedAt DateTime @updatedAt
}
```

### New Models
```prisma
model Contact {
  id String @id @default(uuid())
  userId String
  contactUserId String?
  contactPhoneNumber String?
  contactPhoneNumberHash String?  // SHA256 hash for privacy
  displayName String?
  isFavorite Boolean @default(false)
  blockedAt DateTime?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation("ContactOwner", fields: [userId])
  contactUser User? @relation("ContactUser", fields: [contactUserId])
}

model Block {
  id String @id @default(uuid())
  blockingUserId String
  blockedUserId String
  reason String?
  createdAt DateTime @default(now())
  
  blockingUser User @relation("BlockingUser", fields: [blockingUserId])
  blockedUser User @relation("BlockedUser", fields: [blockedUserId])
}
```

### Chat & Message Changes
```prisma
model Chat {
  // New fields for channels:
  isChannel Boolean @default(false)
  description String?
  creatorId String?
  subscriberCount Int @default(0)
  pinnedMessageId String?
  isPublic Boolean @default(false)
}

model ChatMessage {
  // New field for message status:
  status MessageStatus @default(SENT)
}
```

## New Services

### 1. Username Service (`username.service.ts`)
Handles username management and discovery.

**Key Functions:**
- `validateUsername(username)` - Validates username format
- `checkUsernameAvailability(username)` - Checks if username is available
- `claimUsername(userId, username)` - Claims a username for a user
- `getUserByUsername(username)` - Gets user profile by username
- `searchUsernames(query, limit)` - Searches for usernames with autocomplete
- `isUserProfileVisible(userId, viewerId)` - Privacy-aware visibility check

**Reserved Usernames:** admin, system, root, support, help, test, api, app, bot, official, nexttalk, etc.

**Username Rules:**
- 3-30 characters
- Alphanumeric, dots, hyphens, underscores only
- Case-insensitive uniqueness

### 2. Block Service (`block.service.ts`)
Manages user blocking relationships.

**Key Functions:**
- `blockUser(blockingUserId, blockedUserId, reason)` - Block a user
- `unblockUser(blockingUserId, blockedUserId)` - Unblock a user
- `isUserBlocked(blockingUserId, blockedUserId)` - Check if user is blocked
- `getBlockedUsers(userId)` - Get list of blocked users
- `getUsersBlockingMe(userId)` - Get list of users who blocked me

### 3. Contact Service (`contact.service.ts`)
Manages user contacts and import.

**Key Functions:**
- `importContactsFromPhones(userId, phoneNumbers)` - Import contacts from phone list
- `addContact(userId, contactUserId)` - Add a single contact
- `removeContact(userId, contactUserId)` - Remove a contact
- `getContacts(userId)` - Get all contacts
- `getContactCount(userId)` - Count contacts
- `isContact(userId, contactUserId)` - Check if contact exists
- `setFavoriteContact(userId, contactUserId, isFavorite)` - Mark as favorite
- `getFavoriteContacts(userId)` - Get favorite contacts
- `searchContacts(userId, query)` - Search contacts by name/username

**Phone Number Handling:**
- Phone numbers are stored as hashes (SHA256) for privacy
- Supports multiple phone formats
- Minimum validation (9+ digits)

### 4. Privacy Service (`privacy.service.ts`)
Manages user privacy settings and visibility rules.

**Privacy Modes:**
- **PUBLIC**: Profile visible to everyone, stories publicly visible
- **PRIVATE**: Profile visible only to contacts, stories visible to contacts only
- **SEMI_PRIVATE**: Profile visible to contacts + followers, mixed story visibility

**Key Functions:**
- `getUserPrivacySettings(userId)` - Get privacy configuration
- `updatePrivacyMode(userId, privacyMode)` - Change privacy mode
- `isProfileVisible(profileOwnerId, viewerId)` - Check profile visibility
- `isStoryVisible(storyOwnerId, viewerId, storyVisibility)` - Check story visibility
- `canUserMessage(senderId, recipientId)` - Check messaging permission
- `getVisibleProfiles(viewerId, limit)` - Get profiles visible to user

**Visibility Rules:**
- Users can always see their own profiles
- Blocked users cannot see anything
- Contact status affects visibility for PRIVATE/SEMI_PRIVATE users
- Follow status affects SEMI_PRIVATE visibility

### 5. Discovery Service (`discovery.service.ts`)
User discovery and search optimization.

**Key Functions:**
- `searchUsers(query, limit)` - Search users with username priority
- `getTrendingUsers(limit)` - Get trending users
- `searchByInterests(interests, limit)` - Search by interests
- `getSuggestedUsers(currentUserId, limit)` - Get personalized suggestions
- `invalidateUserSearchCache(userId)` - Invalidate cache

**Search Priority:**
1. Username exact start match
2. Display name contains match
3. Results cached for 5 minutes

## New Routes

### Username Routes (`/api/username`)
```
POST /api/username/check-availability
  - Check if username is available
  - Body: { username: string }
  - Response: { available: boolean, username: string }

POST /api/username/claim
  - Claim username for current user
  - Auth required
  - Body: { username: string }
  - Response: { message: string, username: string }

GET /api/username/:username
  - Get public profile by username
  - Response: { id, username, profile, followerCount, reputation }

GET /api/username/search?q=query&limit=10
  - Search usernames
  - Response: { query, count, results }
```

### Contact Routes (`/api/contacts`)
```
POST /api/contacts/import
  - Import contacts from phone numbers
  - Auth required, CSRF protected
  - Body: { phoneNumbers: string[] }
  - Response: { message, count, contacts }

POST /api/contacts/add
  - Add a single contact
  - Auth required, CSRF protected
  - Body: { contactUserId: string, displayName?: string }

DELETE /api/contacts/:contactUserId
  - Remove a contact
  - Auth required, CSRF protected

GET /api/contacts/list
  - Get all contacts
  - Auth required
  - Query: ?includeBlocked=false

POST /api/contacts/:contactUserId/favorite
  - Set contact as favorite
  - Auth required, CSRF protected
  - Body: { isFavorite: boolean }

GET /api/contacts/favorites
  - Get favorite contacts
  - Auth required

GET /api/contacts/search?q=query
  - Search contacts
  - Auth required

POST /api/contacts/:contactUserId/block
  - Block a contact
  - Auth required, CSRF protected
  - Body: { reason?: string }

DELETE /api/contacts/:contactUserId/block
  - Unblock a contact
  - Auth required, CSRF protected

GET /api/contacts/blocked-users
  - Get list of blocked users
  - Auth required
```

### Privacy Routes (`/api/privacy`)
```
GET /api/privacy/settings
  - Get user's privacy settings
  - Auth required
  - Response: { privacyMode, profile }

PUT /api/privacy/mode
  - Update privacy mode
  - Auth required, CSRF protected
  - Body: { privacyMode: "PUBLIC"|"PRIVATE"|"SEMI_PRIVATE" }

GET /api/privacy/profile-visible/:userId
  - Check if profile is visible to viewer
  - Auth required

GET /api/privacy/story-visible/:storyOwnerId
  - Check if story is visible
  - Auth required
  - Query: ?storyVisibility=PUBLIC|FOLLOWERS

POST /api/privacy/can-message
  - Check if user can message another user
  - Auth required
  - Body: { recipientId: string }
  - Response: { canMessage: boolean, reason?: string }

GET /api/privacy/visible-profiles
  - Get profiles visible to current user
  - Auth required
  - Query: ?limit=20
```

## Frontend Components

### New Components Needed
1. **UsernameProfile.tsx** - Display username profile
2. **PrivacySettings.tsx** - Privacy mode selector
3. **ContactManager.tsx** - Contact import/management UI
4. **BlockList.tsx** - Blocked users management
5. **MessageStatus.tsx** - Message status indicator
6. **DiscoveryList.tsx** - Suggested users

### Enhanced Components
- **ProfileCard.tsx** - Add username, privacy indicator
- **GlobalSearchBar.tsx** - Add username search priority
- **UltraTelegramChat.tsx** - Add message status indicators

## Database Migrations

Run the migration:
```bash
npm run prisma:migrate --workspace @kongo-love/backend
npm run prisma:generate --workspace @kongo-love/backend
```

The migration file (`001_phase1_nexttalk.sql`) includes:
- New enums: PrivacyMode, MessageStatus
- User table updates
- Profile table updates
- New Contact table
- New Block table
- Chat table updates for channels
- ChatMessage updates for status tracking
- All necessary indexes

## Security Considerations

1. **Phone Number Privacy**
   - Stored as SHA256 hashes, not raw numbers
   - GDPR compliant (no plaintext storage)

2. **Username Squatting**
   - Reserved words list
   - Verification required for business accounts
   - Inactive accounts can be reclaimed after 1 year

3. **Blocking Logic**
   - Blocked users cannot see:
     - Profile
     - Stories
     - Status
     - Interact via messaging
   - Blocking is one-way

4. **Contact Sync**
   - Should require user permission
   - Phone numbers hashed before storage
   - Compliance with GDPR/local regulations

5. **Privacy Enforcement**
   - All queries check privacy settings
   - Blocking always takes precedence
   - Backend validates all requests

## Performance Optimizations

1. **Indexes**
   - Username search: `usernameSearchLower`
   - Contact phone: `contactPhoneNumberHash`
   - Quick lookups: `User_username_idx`

2. **Caching** (Redis)
   - User searches (5 min TTL)
   - Trending users (1 hour TTL)
   - Profile visibility checks
   - Contact lists

3. **Database Queries**
   - Use select() to limit fields
   - Batch imports with transaction
   - Pagination for lists

## Testing Checklist

- [ ] Username availability check
- [ ] Username claiming and uniqueness
- [ ] Privacy mode changes and enforcement
- [ ] Contact import with phone numbers
- [ ] Contact add/remove/favorite
- [ ] Blocking and unblocking
- [ ] Profile visibility rules (PUBLIC/PRIVATE/SEMI_PRIVATE)
- [ ] Story visibility rules
- [ ] Messaging permission checks
- [ ] Suggested users generation
- [ ] Search with username priority
- [ ] Cache invalidation
- [ ] CSRF protection on sensitive routes
- [ ] Rate limiting on import

## Next Steps (Phase 2)

- [ ] Implement channels system
- [ ] Add message status real-time updates
- [ ] Create channel discovery UI
- [ ] Implement voice messages
- [ ] Add verification badge workflow
- [ ] Advanced permission system

---

Last updated: April 21, 2025
