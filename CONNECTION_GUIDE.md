# 🎉 KongoLove - Guide de Connexion & Opérations

## ✅ STATUS: APPLICATION OPÉRATIONNELLE

### 🌐 Accès

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Base de données**: PostgreSQL @ 127.0.0.1:5433

### 👤 Superadmin (Compte de Test)

**Email**: elvisedvais203@gmail.com  
**Téléphone**: +243895966288  
**Mot de passe**: Edvais@CongoLove2026!  
**Rôle**: SUPERADMIN  
**Plan**: PREMIUM

---

## 🔐 Processus de Connexion

### Méthode 1: Firebase Phone Authentication (Recommandée)

1. Aller sur http://localhost:3000/auth
2. Entrer le numéro de téléphone: `+243895966288`
3. Cliquer sur "Envoyer code"
4. **Firebase envoie un SMS avec code OTP** (vérifier Firebase Console en dev)
5. Entrer le code OTP reçu (6 chiffres)
6. Cliquer sur "Verifier et se connecter"
7. Redirection vers le dashboard

### Configuration Firebase pour Localhost

Firebase est pré-configuré pour:
- ✓ Projets ID: `kongolove-7ab7e`
- ✓ Authentification par SMS
- ✓ reCAPTCHA invisible activé
- ✓ localhost:3000 autorisé

**En développement**: Les SMS ne sont pas réellement envoyés. Firebase simule l'OTP.

---

## 🧪 Test d'Intégration Rapide

### 1. Vérifier le Health Check

```bash
curl http://localhost:4000/api/health
```

Réponse attendue:
```json
{
  "ok": true,
  "service": "kongo-love-backend",
  "uptimeSec": 123,
  "timestamp": "2026-04-22T..."
}
```

### 2. Vérifier la Connexion à la BDD

```bash
curl http://localhost:4000/api/ready
```

Réponse attendue:
```json
{
  "database": true,
  "redis": false,
  "redisConfigured": true
}
```

---

## 📊 Base de Données

**Status**: ✅ Synchronized avec Prisma  
**Migrations**: ✅ Appliquées  
**Superadmin**: ✅ Créé et Vérifié au démarrage

### Schéma Principal

- **Users**: Authentification, profils, rôles
- **Messages**: Chat privé et groupe
- **Matches**: Système de matchmaking
- **Photos**: Galerie utilisateur
- **LoginEvents**: Audit trail authentification
- **Subscriptions**: Gestion des plans
- **Payments**: Transactions

---

## 🛠️ Commandes Utiles

### Démarrer l'App

```bash
cd "d:\mon passe temps\nextalk"
npm run dev
```

### Frontend Seul

```bash
npm run dev:frontend
```

### Backend Seul

```bash
npm run dev:backend
```

### Vérifier Prisma Schema

```bash
cd apps/backend
npx prisma studio
```

### Reset Base de Données (ATTENTION: Destructif)

```bash
cd apps/backend
npx prisma migrate reset
npx prisma db push
```

---

## 🐛 Problèmes Courants & Solutions

| Problème | Cause | Solution |
|----------|-------|----------|
| BDD inaccessible | PostgreSQL non démarré | Vérifier le service PostgreSQL @ 127.0.0.1:5433 |
| CORS errors | Domaine non autorisé | Vérifier `CORS_ORIGIN` dans `.env` |
| Firebase SMS non envoyé | Clé Firebase invalide | Vérifier `NEXT_PUBLIC_FIREBASE_*` dans `.env` |
| Image logo manquante | Fichier PNG absent | ✅ CORRIGÉ - Logo SVG créé |
| Turbopack error | Webpack/Turbopack conflit | ✅ CORRIGÉ - Config Turbopack ajoutée |

---

## ✨ Prochaines Étapes

- [ ] Tester inscription nouveau compte
- [ ] Tester envoi/réception messages
- [ ] Tester matchmaking
- [ ] Tester paiements
- [ ] Configurer notifications push
- [ ] Déployer sur production

---

## 📝 Notes

- **Mode Développement**: Tous les services en mode dev
- **Base de Données**: PostgreSQL local @ 127.0.0.1:5433
- **Redis**: Optionnel (non configuré par défaut en dev)
- **Firebase**: Authentification par SMS via Twilio simulée
- **Cloudinary**: Upload médias intégré

---

*Dernière mise à jour: 2026-04-22*  
*Status: 🟢 OPÉRATIONNEL*
