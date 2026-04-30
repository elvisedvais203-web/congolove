# @nextalk/firebase-backend

Service Express minimal pour:
- Profil Firestore `profiles/{uid}` (GET/PATCH)
- Upload image/vidéo vers Firebase Storage (`/api/upload`) + URL signée

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Mettre dans `.env`:
- `FIREBASE_STORAGE_BUCKET=my-project.appspot.com`
- `FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json`

Endpoints:
- `GET /api/health`
- `GET /api/profile/:uid`
- `PATCH /api/profile/:uid`
- `POST /api/upload` (multipart: `uid`, `file`)

