require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { z } = require("zod");
const { initFirebaseAdmin } = require("./firebaseAdmin");

const admin = initFirebaseAdmin();
const db = admin.firestore();
const bucket = admin.storage().bucket();

const app = express();
app.use(express.json({ limit: "1mb" }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (!allowedOrigins.length) return cb(null, true);
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error("CORS not allowed"), false);
    }
  })
);

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "firebase-backend" });
});

async function requireFirebaseAuth(req, res, next) {
  try {
    const h = String(req.headers.authorization || "");
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ error: "Missing Authorization: Bearer <idToken>" });
    const idToken = m[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = { uid: decoded.uid, decoded };
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid ID token" });
  }
}

async function requireAppCheck(req, res, next) {
  try {
    const token = String(req.headers["x-firebase-appcheck"] || "").trim();
    if (!token) return res.status(401).json({ error: "Missing X-Firebase-AppCheck token" });
    await admin.appCheck().verifyToken(token);
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid App Check token" });
  }
}

const ProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(60).optional(),
  bio: z.string().trim().max(280).optional(),
  photoUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional()
});

app.get("/api/profile/:uid", async (req, res) => {
  const uid = String(req.params.uid || "").trim();
  if (!uid) return res.status(400).json({ error: "Missing uid" });

  const ref = db.collection("profiles").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) return res.json({ uid, exists: false, profile: null });
  return res.json({ uid, exists: true, profile: snap.data() });
});

app.patch("/api/profile/:uid", requireAppCheck, requireFirebaseAuth, async (req, res) => {
  const uid = String(req.params.uid || "").trim();
  if (!uid) return res.status(400).json({ error: "Missing uid" });
  if (req.user?.uid !== uid) return res.status(403).json({ error: "Forbidden" });

  const parsed = ProfileSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body", details: parsed.error.flatten() });
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const ref = db.collection("profiles").doc(uid);
  await ref.set(
    {
      ...parsed.data,
      uid,
      updatedAt: now,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    },
    { merge: true }
  );

  const snap = await ref.get();
  return res.json({ uid, profile: snap.data() });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

app.post("/api/upload", requireAppCheck, requireFirebaseAuth, upload.single("file"), async (req, res) => {
  const uid = req.user?.uid;
  if (!uid) return res.status(401).json({ error: "Unauthorized" });
  if (!req.file) return res.status(400).json({ error: "Missing file" });

  const mime = req.file.mimetype || "application/octet-stream";
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  if (!isImage && !isVideo) {
    return res.status(400).json({ error: "Only image/* or video/* allowed", mime });
  }

  const ext =
    (req.file.originalname || "").split(".").pop()?.toLowerCase() ||
    (isImage ? "jpg" : "mp4");

  const kind = isImage ? "images" : "videos";
  const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const objectPath = `uploads/${uid}/${kind}/${filename}`;

  const file = bucket.file(objectPath);
  await file.save(req.file.buffer, {
    resumable: false,
    contentType: mime,
    metadata: {
      cacheControl: "public, max-age=31536000"
    }
  });

  // URL publique non signée (ACL public-read)
  await file.makePublic();
  const publicUrl = file.publicUrl();

  return res.json({
    uid,
    kind,
    mime,
    path: objectPath,
    url: publicUrl
  });
});

const port = Number(process.env.PORT || 4100);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`[firebase-backend] listening on http://localhost:${port}`);
});

