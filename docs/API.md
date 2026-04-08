# API KongoLove

Base URL: /api

## Auth
- POST /auth/firebase/verify
- POST /auth/refresh

## Matching
- GET /matching/discover?limit=20
- POST /matching/swipe

## Messages
- GET /messages?matchId={id}&page=1&take=20
- POST /messages

## Profile
- GET /profile/me
- PATCH /profile/me
- DELETE /profile/me

## Chat Pro
- GET /chats/conversations
- GET /chats/:chatId/messages
- GET /chats/:chatId/search?q=...
- POST /chats/:chatId/messages
- POST /chats/:chatId/read
- POST /chats/:chatId/archive
- PATCH /chats/messages/:messageId
- DELETE /chats/messages/:messageId
- POST /chats/messages/:messageId/reactions
- POST /chats/groups
- POST /chats/groups/:chatId/members
- DELETE /chats/groups/:chatId/members/:memberId
- POST /chats/maintenance/clear-all
- DELETE /chats/maintenance/delete-all

## Paiement
- POST /payments/premium

## Security
- GET /security/csrf-token

## Health
- GET /health
- GET /ready

## Moderation
- POST /moderation/report
- GET /moderation/admin/stats

## Socket.io events
- join_match
- send_message
- new_message
- message_error
