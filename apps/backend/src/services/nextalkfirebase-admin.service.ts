import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { env } from "../config/nextalkenv";
import { ApiError } from "../utils/nextalkapierror";

let firebaseApp: App | null = null;

function parseServiceAccount() {
  if (env.firebaseServiceAccountJson) {
    try {
      return JSON.parse(env.firebaseServiceAccountJson) as {
        project_id: string;
        client_email: string;
        private_key: string;
      };
    } catch {
      throw new ApiError(500, "FIREBASE_SERVICE_ACCOUNT_JSON invalide.");
    }
  }

  if (!env.firebaseProjectId || !env.firebaseClientEmail || !env.firebasePrivateKey) {
    throw new ApiError(500, "Configuration Firebase Admin manquante.");
  }

  return {
    project_id: env.firebaseProjectId,
    client_email: env.firebaseClientEmail,
    private_key: env.firebasePrivateKey.replace(/\\n/g, "\n")
  };
}

function getFirebaseApp(): App {
  if (firebaseApp) {
    return firebaseApp;
  }

  if (getApps().length > 0) {
    firebaseApp = getApps()[0]!;
    return firebaseApp;
  }

  const serviceAccount = parseServiceAccount();
  firebaseApp = initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key
    })
  });

  return firebaseApp;
}

export async function verifyFirebaseIdToken(idToken: string) {
  if (!idToken) {
    throw new ApiError(400, "ID token Firebase requis.");
  }

  const auth = getAuth(getFirebaseApp());
  try {
    const decoded = await auth.verifyIdToken(idToken, true);
    if (!decoded.uid || !decoded.phone_number) {
      throw new ApiError(400, "Token Firebase invalide: numero manquant.");
    }

    return {
      uid: decoded.uid,
      phoneNumber: decoded.phone_number
    };
  } catch {
    throw new ApiError(401, "Session Firebase invalide ou expiree.");
  }
}
