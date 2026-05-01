# Mobile (Android + iOS)

Ces apps sont **indépendantes** du frontend Next.js et utilisent Firebase (Auth + Firestore) + le backend `@nextalk/firebase-backend` pour l'upload.

## Pré-requis

- Un projet Firebase (Firestore + Storage activés)
- **Règles**: utiliser `../firebase/firestore.rules` et `../firebase/storage.rules`
- Un **service account** Firebase pour le backend (Admin SDK)

## 1) Lancer le backend upload

Dans `nextalk/` :

```bash
cp apps/firebase-backend/.env.example apps/firebase-backend/.env
npm install
npm --workspace @nextalk/firebase-backend run dev
```

Puis éditer `apps/firebase-backend/.env` :
- `FIREBASE_STORAGE_BUCKET=my-project.appspot.com`
- `FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json` (mets le fichier dans `apps/firebase-backend/`)

Healthcheck: `http://localhost:4100/api/health`

## 2) Android (Kotlin)

Dossier: `mobile/android/NextalkMobileAndroid`

1. Dans Firebase Console → Android app → télécharge `google-services.json`
2. Place-le dans: `mobile/android/NextalkMobileAndroid/app/google-services.json`
3. Ouvre le dossier dans Android Studio, Sync, puis Run.

Dans l'app: configure l'URL backend dans `BuildConfig.BACKEND_BASE_URL`.

### App Check (Android)

- En prod: Play Integrity
- En debug: Debug Provider (un token est affiché dans Logcat, à enregistrer dans Firebase Console → App Check → Android → Debug tokens)

## 3) iOS (Swift)

Dossier: `mobile/ios/NextalkMobileiOS`

1. Dans Firebase Console → iOS app → télécharge `GoogleService-Info.plist`
2. Place-le dans: `mobile/ios/NextalkMobileiOS/NextalkMobileiOS/GoogleService-Info.plist`
3. Ouvre `NextalkMobileiOS.xcodeproj` dans Xcode, puis Run.

Dans l'app: configure `BACKEND_BASE_URL` dans `Config.swift`.

### App Check (iOS)

- En prod: App Attest (iOS 14+) / DeviceCheck
- En debug: Debug Provider (token dans logs, à enregistrer dans Firebase Console → App Check → iOS → Debug tokens)

