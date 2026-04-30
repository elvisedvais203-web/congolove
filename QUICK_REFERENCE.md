# NexTalk Phase 1 - Quick Reference Guide

## 🚀 Quick Start for Developers

### Get Up to Speed (5 minutes)
1. **Read**: `IMPLEMENTATION_SUMMARY.md` - High-level overview
2. **Review**: `docs/API.md` - See new endpoints (username, contacts, privacy)
3. **Check**: `docs/BRANDING_GUIDE.md` - UI standards

### Detailed References
- **Services**: `apps/backend/src/services/{username,block,contact,privacy,discovery}.service.ts`
- **Routes**: `apps/backend/src/routes/{username,contacts,privacy}.routes.ts`
- **Database**: `apps/backend/prisma/schema.prisma`
- **Full Guide**: `docs/PHASE1_IMPLEMENTATION.md`

---

## 📊 What's New

### 3 New Services
| Service | Purpose | Functions |
|---------|---------|-----------|
| `username` | Username system | validate, claim, lookup, search (+ privacy checks) |
| `block` | User blocking | block/unblock, check, list |
| `contact` | Contact management | import from phones, add, remove, favorite, search |
| `privacy` | Privacy enforcement | settings, visibility, messaging permissions |
| `discovery` | User discovery | search (username-priority), trending, suggestions |

### 3 New Route Groups
| Route | Endpoints | Purpose |
|-------|-----------|---------|
| `/api/username` | 4 endpoints | Username registration and lookup |
| `/api/contacts` | 9 endpoints | Contact import, management, blocking |
| `/api/privacy` | 6 endpoints | Privacy settings and enforcement |

### 2 New Database Models
```sql
Contact {
  id, userId, contactUserId, phoneHash, displayName, isFavorite
}

Block {
  id, blockingUserId, blockedUserId, reason
}
```

### 2 New Enums
```sql
PrivacyMode: PUBLIC | PRIVATE | SEMI_PRIVATE
MessageStatus: SENT | DELIVERED | SEEN
```

---

## 🔑 Key Concepts

### Privacy Modes
```
PUBLIC        → Everyone can see profile
PRIVATE       → Only contacts can see profile
SEMI_PRIVATE  → Contacts + followers can see profile
```

### Username Features
- Unique, searchable @username
- Format: 3-30 chars, alphanumeric + . - _
- Reserved: admin, system, root, support, help, test, api, bot, etc.

### Contact Import
- Import from phone numbers (bulk)
- Phone numbers stored as SHA256 hash
- Detects users already on platform
- Rate-limited (prevent spam)

### User Blocking
- One-way relationship (A blocks B, B doesn't know)
- Blocks visibility of profile/stories/messages
- Absolute precedence over privacy modes

### Message Status
- SENT: Message delivered to server
- DELIVERED: Received by recipient (real-time via Socket.io)
- SEEN: Read by recipient (real-time via Socket.io)

---

## 🛠️ Common Tasks

### Add New Username
```bash
POST /api/username/claim
Headers: Authorization: Bearer {token}, X-CSRF-Token: {token}
Body: { "username": "john_doe" }
```

### Import Contacts
```bash
POST /api/contacts/import
Headers: Authorization: Bearer {token}, X-CSRF-Token: {token}
Body: { "phoneNumbers": ["+243701234567", "+243702345678"] }
```

### Change Privacy Mode
```bash
PUT /api/privacy/mode
Headers: Authorization: Bearer {token}, X-CSRF-Token: {token}
Body: { "privacyMode": "PRIVATE" }
```

### Block User
```bash
POST /api/contacts/block
Headers: Authorization: Bearer {token}, X-CSRF-Token: {token}
Body: { "reason": "Harassment" }
```

### Search Users
```bash
GET /api/username/search?q=john&limit=10
```

---

## 📱 Frontend Components (To Do)

### Need to Create (6)
1. **UsernameProfile** - Display user with @username
2. **PrivacySettings** - Toggle privacy modes
3. **ContactManager** - Import and manage contacts
4. **BlockList** - View and manage blocks
5. **MessageStatus** - Show ✓/✓✓/✓✓✓ status
6. **DiscoveryList** - Trending and suggestions

### Need to Update (3)
1. **ProfileCard** - Add username and privacy badge
2. **GlobalSearchBar** - Search with username priority
3. **UltraTelegramChat** - Show message status and delivery

---

## 🔐 Security Checklist

- ✅ All mutations require CSRF token
- ✅ All auth endpoints require JWT
- ✅ Phone numbers hashed before storage
- ✅ Blocking prevents information leakage
- ✅ Privacy modes enforced at service layer
- ✅ Rate limiting on sensitive operations
- ✅ Audit logging on all actions

---

## 📊 Testing Priorities

### High Priority
- [ ] Username claim flow (valid, reserved, duplicate)
- [ ] Contact import (detect users, handle phone formats)
- [ ] Privacy mode enforcement (visibility rules)
- [ ] Blocking behavior (visibility prevention)

### Medium Priority
- [ ] Search performance (caching)
- [ ] Bulk operations (1000+ contacts)
- [ ] Edge cases (self-block, duplicate contacts)

---

## 🚨 Common Issues

### Issue: "Username already taken"
- ✅ Check database if not claimed yet (data sync issue)
- ✅ Check usernameSearchLower field

### Issue: Contact import not finding users
- ✅ Check phone number format (must include +country_code)
- ✅ Check if user exists in system
- ✅ Verify contact phone hash logic

### Issue: Profile not visible
- ✅ Check privacy mode (may be PRIVATE)
- ✅ Check if user is blocked
- ✅ Verify contact status (for PRIVATE/SEMI_PRIVATE)

### Issue: Message status not showing
- ✅ Check ChatMessage.status field exists (migration run?)
- ✅ Verify Socket.io emitting status updates
- ✅ Check frontend component displaying status

---

## 📚 Files Quick Reference

```
Phase 1 Documentation:
├── IMPLEMENTATION_SUMMARY.md       ← Start here
├── docs/PHASE1_IMPLEMENTATION.md   ← Detailed guide
├── docs/BRANDING_GUIDE.md          ← UI standards
├── docs/API.md                     ← API reference
├── README.md                       ← Project overview

Backend Implementation:
├── src/services/
│   ├── username.service.ts         (180 LOC)
│   ├── block.service.ts            (100 LOC)
│   ├── contact.service.ts          (250 LOC)
│   ├── privacy.service.ts          (280 LOC)
│   └── discovery.service.ts        (200 LOC)
├── src/routes/
│   ├── username.routes.ts          (75 LOC)
│   ├── contacts.routes.ts          (150 LOC)
│   └── privacy.routes.ts           (115 LOC)
└── prisma/
    ├── schema.prisma               (updated)
    └── migrations/001_phase1_nexttalk.sql

Frontend Assets:
├── public/manifest.json            (updated)
└── src/components/                 (todo: 6 new components)
```

---

## 🎯 Migration Checklist

Before going to production:

**Backend Setup**
- [ ] Run: `npm run prisma:generate --workspace @nextalk/backend`
- [ ] Run: `npm run prisma:migrate --workspace @nextalk/backend`
- [ ] Run: `npm run build --workspace @nextalk/backend`
- [ ] Run: `npm test --workspace @nextalk/backend`

**Testing**
- [ ] Test all new endpoints
- [ ] Verify blocking works
- [ ] Verify privacy modes work
- [ ] Check contact import
- [ ] Verify caching works

**Frontend**
- [ ] Create new components
- [ ] Update existing components
- [ ] Test username flow
- [ ] Test privacy settings

**Deployment**
- [ ] Update environment variables
- [ ] Run database migrations
- [ ] Verify Redis cache working
- [ ] Monitor error logs
- [ ] Set up monitoring for new endpoints

---

## 💡 Pro Tips

### Performance
- Username search is cached (5 min TTL)
- Trending users cached (1 hour TTL)
- Use pagination for large lists
- Phone hash index speeds up imports

### Development
- All services follow same pattern: return `{success, data, error}`
- All routes use authGuard + csrfGuard for mutations
- Blocking always checked before visibility
- Privacy enforced at service layer (not route layer)

### Debugging
- Check audit logs for action tracking
- Verify phone numbers have +country_code
- Test privacy modes in order: PUBLIC → PRIVATE → SEMI_PRIVATE
- Use postman/curl with proper CSRF token headers

---

## 🔄 Workflow Summary

### For Backend Developer
1. Read this guide (5 min)
2. Review service implementations (15 min)
3. Review route implementations (10 min)
4. Test endpoints with Postman (15 min)

### For Frontend Developer
1. Review BRANDING_GUIDE.md (10 min)
2. Create 6 new components (2-3 hours)
3. Update 3 existing components (1-2 hours)
4. Test with backend (1 hour)

### For QA/Testing
1. Review testing checklist in PHASE1_IMPLEMENTATION.md
2. Create test cases for each endpoint
3. Test edge cases and error scenarios
4. Load test with realistic data

---

**Phase 1 Status**: ✅ Complete  
**Next Phase**: Phase 2 (Channels, Voice, Advanced Features)  
**Last Updated**: April 21, 2025

