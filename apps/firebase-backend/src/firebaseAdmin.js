const fs = require("node:fs");
const path = require("node:path");
const admin = require("firebase-admin");

function loadServiceAccount() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inline) return JSON.parse(inline);

  const p = process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim();
  if (!p) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH"
    );
  }

  const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

function initFirebaseAdmin() {
  if (admin.apps.length) return admin;

  const credential = admin.credential.cert(loadServiceAccount());
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET?.trim();
  if (!storageBucket) {
    throw new Error("Missing FIREBASE_STORAGE_BUCKET (ex: my-project.appspot.com)");
  }

  admin.initializeApp({ credential, storageBucket });
  return admin;
}

module.exports = { initFirebaseAdmin };

