# KongoLove Platform

Plateforme de rencontre mobile-first pour la RDC avec modele freemium, paiement Mobile Money et messagerie temps reel.

## Stack
- Backend: Node.js + Express + Prisma + PostgreSQL + Redis + Socket.io
- Frontend: Next.js + TailwindCSS + PWA
- Media: Cloudinary ou S3/CDN
- Paiements: architecture Strategy pour Airtel, Orange, M-Pesa, Africell, AfriMoney

## Fonctionnalites
- Auth email/telephone + OTP (mock ready)
- Connexion normalisee sur numero RDC (+243)
- JWT access/refresh
- Swipe like/pass + creation match
- Chat temps reel texte/image/video
- Option economie data (user setting)
- Freemium: limites gratuites + premium illimite
- Paiement premium sandbox
- Moderation: signalement + reputation
- Admin stats
- CSRF token pour actions sensibles
- Audit logs persistants (table audit_logs)
- Detection anti-spam chat (flood, duplication, liens)

## Superadmin bootstrap
- Definir `SUPERADMIN_EMAIL`, `SUPERADMIN_PHONE`, `SUPERADMIN_PASSWORD` dans `apps/backend/.env`
- Executer `npm run seed --workspace @kongo-love/backend` pour creer/mettre a jour le compte `SUPERADMIN`

## Structure
- apps/backend: API, sockets, services metier
- apps/frontend: interface Next.js mobile-first
- db/schema.sql: schema SQL brut
- docs/API.md: endpoints
- docs/DEPLOYMENT.md: guide production

## Demarrage local
1. Copier .env.example vers .env (root + apps).
2. Installer dependances:
   - npm install
3. Backend en mode local mock (sans DB obligatoire):
   - cd apps/backend
   - npm start
4. Frontend:
   - cd ../../
   - npm run dev:frontend

Option base de donnees reelle:
5. Lancer infrastructure locale:
   - docker compose up -d
6. Generer Prisma client:
   - npm run prisma:generate --workspace @kongo-love/backend
7. Migrer DB et seed:
   - npm run prisma:migrate --workspace @kongo-love/backend
   - npm run seed --workspace @kongo-love/backend
8. Lancer apps:
   - npm run dev

7. Smoke test securite (CSRF + mutation sensible):
   - npm run test:security:smoke --workspace @kongo-love/backend

Frontend: http://localhost:3000
Backend: http://localhost:4000/api/health

## Notes production
- Ajouter vrai fournisseur OTP SMS local
- Brancher APIs officielles Mobile Money
- Ajouter pipeline CI/CD (tests + security scan + deploy)
- Activer moderation media IA en asynchrone
- Cote frontend, appeler /api/security/csrf-token puis envoyer x-csrf-token sur toutes les mutations API
