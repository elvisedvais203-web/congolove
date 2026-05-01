import { Router } from "express";
import multer from "multer";
import { unlink } from "node:fs/promises";
import { authGuard, AuthRequest } from "../middleware/nextalkauth";
import { csrfGuard } from "../middleware/nextalkcsrf";
import { createSignedUploadPayload, uploadMedia } from "../services/nextalkmedia.service";
import { ApiError } from "../utils/nextalkapierror";

const router = Router();
const upload = multer({
  dest: "tmp/uploads",
  limits: { fileSize: 120 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "audio/webm",
      "audio/mpeg",
      "audio/mp4",
      "audio/aac",
      "audio/ogg",
      "audio/wav"
    ]);
    if (!allowed.has(file.mimetype)) {
      cb(new ApiError(400, "Format fichier non supporte. Utilisez image/video/audio standards (jpg/png/webp/heic/mp4/mov/webm/mp3/m4a/aac/ogg/wav)."));
      return;
    }
    cb(null, true);
  }
});

const allowedFolders = new Set(["messages", "profiles", "stories", "posts", "reels"]);

router.post("/upload/sign", authGuard, csrfGuard, (req: AuthRequest, res, next) => {
  try {
    const rawFolder = String(req.body?.folder ?? "messages").trim();
    const folder = allowedFolders.has(rawFolder) ? rawFolder : "messages";
    const publicIdRaw = String(req.body?.publicId ?? "").trim();
    const publicId = publicIdRaw.length > 0 ? publicIdRaw : undefined;
    const resourceTypeRaw = String(req.body?.resourceType ?? "auto").trim().toLowerCase();
    const resourceType = ["image", "video", "raw", "auto"].includes(resourceTypeRaw)
      ? (resourceTypeRaw as "image" | "video" | "raw" | "auto")
      : "auto";

    const signed = createSignedUploadPayload({ folder, publicId, resourceType });
    res.status(200).json({ ok: true, ...signed });
  } catch (error) {
    next(error);
  }
});

router.post("/upload", authGuard, csrfGuard, upload.single("file"), async (req: AuthRequest, res, next) => {
  const file = req.file;
  const rawFolder = String(req.body?.folder ?? "messages").trim();
  const folder = allowedFolders.has(rawFolder) ? rawFolder : "messages";

  if (!file) {
    return next(new ApiError(400, "Fichier requis."));
  }

  try {
    const url = await uploadMedia(file.path, folder);
    res.status(201).json({
      ok: true,
      url,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname
    });
  } catch (error) {
    next(error);
  } finally {
    await unlink(file.path).catch(() => undefined);
  }
});

export default router;
