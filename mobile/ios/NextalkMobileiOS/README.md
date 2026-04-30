# iOS (SwiftUI)

## 1) Firebase

- Télécharge `GoogleService-Info.plist` depuis Firebase Console (iOS app)
- Place-le ici: `NextalkMobileiOS/GoogleService-Info.plist`

## 2) Ajouter Firebase via SPM (1 fois)

Dans Xcode:
- File → Add Packages…
- Ajoute le package `https://github.com/firebase/firebase-ios-sdk`
- Produits à sélectionner:
  - FirebaseAuth
  - FirebaseFirestore
  - FirebaseCore
  - FirebaseAppCheck

## 3) Backend upload

Assure-toi que `Config.BACKEND_BASE_URL` pointe vers ton backend:
- Simulateur iOS: `http://localhost:4100`
- iPhone réel: `http://IP_DE_TON_PC:4100`

## 4) Run

Ouvre `NextalkMobileiOS.xcodeproj` et lance.

## App Check (debug)

En DEBUG, l'app utilise `AppCheckDebugProvider`. Au premier lancement, Xcode loggue un token debug à enregistrer dans:
Firebase Console → App Check → iOS → Debug tokens.

