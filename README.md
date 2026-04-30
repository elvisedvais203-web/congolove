# NexTalk Platform

NexTalk is a next-generation global communication super-app combining WhatsApp-style private messaging, Instagram-style profiles and stories, Telegram-style groups and channels, with AI-powered features.

Built on: Node.js + Express + Prisma + PostgreSQL + Redis + Socket.io (Backend), Next.js + TailwindCSS + PWA (Frontend)

## Core Features
- 🔐 Phone number & email login with OTP (Firebase Auth)
- 👤 Unique username system (@username) with profile discovery
- 💬 Real-time 1-to-1 messaging (WhatsApp-like)
- 📱 Stories system with 24h expiry (Instagram-like)
- 👥 Groups & Channels with admin roles (Telegram-like)
- 🤖 AI-powered matching and conversation assistance
- 🔒 Privacy modes (Public / Private / Semi-Private)
- 📞 Contact management with import and sync
- 🚫 User blocking and moderation system
- 💳 Freemium model with Mobile Money payments
- 🛡️ Security: CSRF protection, rate limiting, audit logs
- 🌙 Dark mode + Light mode with responsive design

## Architecture
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **Real-time**: Socket.io for messaging and presence
- **Cache**: Redis for sessions and performance
- **Frontend**: Next.js 16 + React 19 + TailwindCSS
- **Storage**: Cloudinary for media
- **Auth**: Firebase Authentication
- **Payments**: Mobile Money provider strategy pattern

## Stack
- Backend: Node.js + Express + Prisma + PostgreSQL + Redis + Socket.io
- Frontend: Next.js + TailwindCSS + PWA
- Media: Cloudinary or S3/CDN
- Payments: architecture Strategy for Airtel, Orange, M-Pesa, Africell, AfriMoney

## Key Functionalities
- Phone & email authentication with OTP
- Username-based user discovery and search
- Real-time 1-to-1 and group messaging
- Privacy controls (Public/Private/Semi-Private profiles)
- Contact management with import and sync
- User blocking and reporting system
- Stories with viewer tracking and privacy
- Channels and broadcast groups
- Message status tracking (Sent/Delivered/Seen)
- AI-powered user matching and suggestions
- Data saver mode option
- Invisible mode for privacy
- Freemium subscription model
- Mobile Money payments (Airtel, Orange, M-Pesa, etc.)
- Moderation: reporting, reputation system
- Admin stats dashboard
- CSRF token for sensitive actions
- Persistent audit logs
- Anti-spam chat detection
- Push notifications

## Superadmin Bootstrap
- Define `SUPERADMIN_EMAIL`, `SUPERADMIN_PHONE`, `SUPERADMIN_PASSWORD` in `apps/backend/.env`
- Execute `npm run seed --workspace @nextalk/backend` to create/update the superadmin account

## Project Structure
- `apps/backend` - REST API, WebSockets, business logic
- `apps/frontend` - Next.js PWA interface
- `packages/shared` - Shared types and utilities
- `db/` - Database schema and scripts
- `docs/` - API documentation and deployment guides

## Getting Started

### Local Development (Mock Mode)
```bash
# 1. Copy environment files
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env

# 2. Install dependencies
npm install

# 3. Run in mock mode (no database required)
npm run dev

# Backend: http://localhost:4000/api/health
# Frontend: http://localhost:3000
```

### Full Setup with Database
```bash
# 1. Copy environment files and configure database
cp .env.example .env
cp apps/backend/.env.example apps/backend/.env

# 2. Start infrastructure (Docker)
docker-compose up -d

# 3. Install dependencies
npm install

# 4. Setup database
npm run prisma:generate --workspace @nextalk/backend
npm run prisma:migrate --workspace @nextalk/backend
npm run seed --workspace @nextalk/backend

# 5. Run applications
npm run dev

# 6. (Optional) Run security smoke tests
npm run test:security:smoke --workspace @nextalk/backend
```

## Production Deployment

See [DEPLOYMENT.md](docs/DEPLOYMENT.md) for:
- Backend deployment to Render
- Frontend deployment to Vercel
- Database configuration (Neon, Supabase, or RDS)
- CDN and media storage setup
- SSL/TLS and DNS configuration

## API Documentation
See [API.md](docs/API.md) for complete REST API endpoints

## Product Vision
NexTalk enables users to:
- Chat privately without phone number requirements
- Share stories and updates
- Discover new people through usernames
- Control profile privacy settings
- Join groups and channels
- Get AI assistance for communication
- Manage contacts and block unwanted interactions

All while maintaining security, privacy, and high performance at scale.

## Notes for Production
- Integrate real OTP SMS provider
- Connect official Mobile Money APIs
- Set up CI/CD pipeline with security scanning
- Enable async AI moderation for media
- Frontend: send CSRF tokens on API mutations
- Configure email notifications service
- Set up error tracking (Sentry, etc.)
- Implement analytics and monitoring
- Add API rate limiting per user tier
- Configure backup strategy

## License
Proprietary - NexTalk Platform 2025

---

**Built with ❤️ for global communication**
