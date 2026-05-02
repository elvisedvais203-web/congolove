# Deploiement Production

## Architecture cible
- Frontend Next.js sur Vercel
- Backend Node.js sur Render (Web Service)
- PostgreSQL managé (Neon, Supabase, RDS)
- Redis managé (Upstash, Redis Cloud)
- CDN media via Cloudinary ou S3+CloudFront
- DNS et SSL via Cloudflare

## Domaines de production
- Frontend: https://app.solola.com
- API Backend: https://solola-api.onrender.com
- Domaine principal: https://solola.com (redirection vers app.solola.com)

## Etapes backend
1. Configurer variables .env backend.
2. Installer dependances puis build:
   - npm install
   - npm run build --workspace @nextalk/backend
3. Migrer DB:
   - npm run prisma:migrate --workspace @nextalk/backend
4. Sur Render:
   - Build command: npm install ; npm run build --workspace @nextalk/backend
   - Start command: npm start --workspace @nextalk/backend
   - Variables: DATABASE_URL, REDIS_URL, JWT_*, FIREBASE_*, CORS_ORIGIN=https://app.solola.com

## Etapes frontend
1. Configurer variables .env frontend.
2. Importer projet sur Vercel.
3. Definir NEXT_PUBLIC_API_URL=https://solola-api.onrender.com/api et NEXT_PUBLIC_SOCKET_URL=https://solola-api.onrender.com.
4. Deploy via branche main.

## DNS Cloudflare (minimum)
- CNAME app -> cname.vercel-dns.com (proxy orange active)
- CNAME api -> endpoint Render de l'API (proxy orange active)
- @ (racine) -> redirection 301 vers https://app.solola.com (Rule Cloudflare)

## Runbook rapide (solola.com)
1. Backend sur Render
   - Importer le repo avec Blueprint depuis `render.yaml`.
   - Verifier que le service `solola-api` est cree.
   - Ajouter les secrets manquants: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (ou `FIREBASE_SERVICE_ACCOUNT_JSON`).
   - Ajouter le domaine custom `solola-api.onrender.com` dans Render.

2. Frontend sur Vercel
   - Importer le repo sur Vercel.
   - Root directory: `apps/frontend`.
   - Variables frontend:
     - `NEXT_PUBLIC_API_URL=https://solola-api.onrender.com/api`
     - `NEXT_PUBLIC_SOCKET_URL=https://solola-api.onrender.com`
       - `NEXT_PUBLIC_FIREBASE_API_KEY=...`
       - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...`
       - `NEXT_PUBLIC_FIREBASE_PROJECT_ID=...`
       - `NEXT_PUBLIC_FIREBASE_APP_ID=...`
   - Ajouter le domaine custom `app.solola.com`.

3. Cloudflare DNS
   - Enregistrement CNAME `app` -> `cname.vercel-dns.com`.
   - Enregistrement CNAME `api` -> l'hote Render fourni (ex: `solola-api.onrender.com`).
   - Regle de redirection: `https://solola.com/*` -> `https://app.solola.com/$1` (301).

4. Firebase Auth
   - Activer Phone Authentication dans Firebase Console.
   - Ajouter les domaines autorises (`app.solola.com`, `localhost`).
   - Generer une cle de service et renseigner les variables backend `FIREBASE_*`.

## Checklist securite
- HTTPS obligatoire (LetsEncrypt)
- Rotation secrets JWT
- Limites rate limiting renforcees sur auth
- Sauvegardes DB automatiques
- Monitoring logs + alerting
- Healthcheck service: verifier `GET /api/health`
- Readiness service: verifier `GET /api/ready`
- Appliquer CSRF: recuperer /api/security/csrf-token apres login puis envoyer x-csrf-token sur POST/PATCH/DELETE
- Activer audit trail: verifier la table audit_logs et brancher export SIEM
- Anti-spam chat: seuils Redis en place (flood, repetition, liens)
- Executer le smoke test: npm run test:security:smoke --workspace @nextalk/backend

## Qualite continue
- Workflow GitHub Actions actif: `.github/workflows/quality.yml`
- Verification automatique: install, type-check backend/frontend, build backend/frontend

## Variables critiques (bloquantes prod)
- Firebase backend:
   - FIREBASE_PROJECT_ID
   - FIREBASE_CLIENT_EMAIL
   - FIREBASE_PRIVATE_KEY (ou FIREBASE_SERVICE_ACCOUNT_JSON)
- Firebase frontend:
   - NEXT_PUBLIC_FIREBASE_API_KEY
   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
   - NEXT_PUBLIC_FIREBASE_PROJECT_ID
   - NEXT_PUBLIC_FIREBASE_APP_ID
- Upload media Cloudinary:
   - MEDIA_PROVIDER=cloudinary
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
- Mobile Money API reelle (optionnel sandbox):
   - MM_AIRTEL_API_URL / MM_AIRTEL_API_TOKEN
   - MM_ORANGE_API_URL / MM_ORANGE_API_TOKEN
   - MM_MPESA_API_URL / MM_MPESA_API_TOKEN
   - MM_AFRICELL_API_URL / MM_AFRICELL_API_TOKEN
   - MM_AFRIMONEY_API_URL / MM_AFRIMONEY_API_TOKEN
- Webhook paiement:
   - PAYMENT_WEBHOOK_SECRET
