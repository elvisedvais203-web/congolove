# API KongoLove

Base URL: /api

## Auth
- POST /auth/register
- POST /auth/login
- POST /auth/otp/send
- POST /auth/otp/verify
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

## Paiement
- POST /payments/premium

## Security
- GET /security/csrf-token

## Moderation
- POST /moderation/report
- GET /moderation/admin/stats

## Socket.io events
- join_match
- send_message
- new_message
- message_error
