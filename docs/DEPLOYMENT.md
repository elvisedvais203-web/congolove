# Deploiement Production

## Architecture cible
- Frontend Next.js sur Vercel
- Backend Node.js sur Render (Web Service)
- PostgreSQL managé (Neon, Supabase, RDS)
- Redis managé (Upstash, Redis Cloud)
- CDN media via Cloudinary ou S3+CloudFront
- DNS et SSL via Cloudflare

## Domaines de production (congolove.com)
- Frontend: https://app.congolove.com
- API Backend: https://api.congolove.com
- Domaine principal: https://congolove.com (redirection vers app.congolove.com)

## Etapes backend
1. Configurer variables .env backend.
2. Installer dependances puis build:
   - npm install
   - npm run build --workspace @kongo-love/backend
3. Migrer DB:
   - npm run prisma:migrate --workspace @kongo-love/backend
4. Sur Render:
   - Build command: npm install ; npm run build --workspace @kongo-love/backend
   - Start command: npm start --workspace @kongo-love/backend
   - Variables: DATABASE_URL, REDIS_URL, JWT_*, OTP_*, CORS_ORIGIN=https://app.congolove.com

## Etapes frontend
1. Configurer variables .env frontend.
2. Importer projet sur Vercel.
3. Definir NEXT_PUBLIC_API_URL=https://api.congolove.com/api et NEXT_PUBLIC_SOCKET_URL=https://api.congolove.com.
4. Deploy via branche main.

## DNS Cloudflare (minimum)
- CNAME app -> cname.vercel-dns.com (proxy orange active)
- CNAME api -> endpoint Render de l'API (proxy orange active)
- @ (racine) -> redirection 301 vers https://app.congolove.com (Rule Cloudflare)

## Runbook rapide (congolove.com)
1. Backend sur Render
   - Importer le repo avec Blueprint depuis `render.yaml`.
   - Verifier que le service `congolove-api` est cree.
   - Ajouter les secrets manquants: `DATABASE_URL`, `REDIS_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `TWILIO_*`, `RESEND_*`.
   - Ajouter le domaine custom `api.congolove.com` dans Render.

2. Frontend sur Vercel
   - Importer le repo sur Vercel.
   - Root directory: `apps/frontend`.
   - Variables frontend:
     - `NEXT_PUBLIC_API_URL=https://api.congolove.com/api`
     - `NEXT_PUBLIC_SOCKET_URL=https://api.congolove.com`
   - Ajouter le domaine custom `app.congolove.com`.

3. Cloudflare DNS
   - Enregistrement CNAME `app` -> `cname.vercel-dns.com`.
   - Enregistrement CNAME `api` -> l'hote Render fourni (ex: `congolove-api.onrender.com`).
   - Regle de redirection: `https://congolove.com/*` -> `https://app.congolove.com/$1` (301).

4. Resend + Twilio
   - Resend: verifier le domaine `congolove.com`, puis utiliser `RESEND_FROM_EMAIL=no-reply@congolove.com`.
   - Twilio: utiliser un numero actif dans `TWILIO_FROM` au format E.164.

## Checklist securite
- HTTPS obligatoire (LetsEncrypt)
- Rotation secrets JWT
- Limites rate limiting renforcees sur auth
- Sauvegardes DB automatiques
- Monitoring logs + alerting
- Appliquer CSRF: recuperer /api/security/csrf-token apres login puis envoyer x-csrf-token sur POST/PATCH/DELETE
- Activer audit trail: verifier la table audit_logs et brancher export SIEM
- Anti-spam chat: seuils Redis en place (flood, repetition, liens)
- Executer le smoke test: npm run test:security:smoke --workspace @kongo-love/backend
