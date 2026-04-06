import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../config/db";
import { writeAuditLog } from "../services/audit.service";
import { ApiError } from "../utils/ApiError";

export async function myProfile(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          phone: true,
          email: true,
          planTier: true,
          reputation: true,
          dataSaverEnabled: true,
          invisibleMode: true,
          photos: true
        }
      }
    }
  });

  const latestVerificationSubmission = await prisma.auditLog.findFirst({
    where: { userId, action: "IDENTITY_VERIFICATION_SUBMITTED" },
    orderBy: { createdAt: "desc" }
  });

  const latestVerificationReview = await prisma.auditLog.findFirst({
    where: { userId, action: "IDENTITY_VERIFICATION_REVIEWED" },
    orderBy: { createdAt: "desc" }
  });

  const submissionAt = latestVerificationSubmission?.createdAt?.getTime() ?? 0;
  const reviewAt = latestVerificationReview?.createdAt?.getTime() ?? 0;
  const reviewMetadata = latestVerificationReview?.metadata as { decision?: "APPROVED" | "REJECTED" } | null;

  let verificationStatus: "unverified" | "pending" | "verified" | "rejected" = profile?.verifiedBadge ? "verified" : "unverified";
  if (submissionAt > reviewAt) {
    verificationStatus = "pending";
  } else if (reviewMetadata?.decision === "REJECTED") {
    verificationStatus = "rejected";
  } else if (profile?.verifiedBadge) {
    verificationStatus = "verified";
  }

  res.json({
    ...profile,
    verificationStatus,
    latestVerificationRequestedAt: latestVerificationSubmission?.createdAt ?? null,
    latestVerificationReviewedAt: latestVerificationReview?.createdAt ?? null
  });
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { displayName, bio, city, interests, dataSaverEnabled, invisibleMode } = req.body as {
    displayName: string;
    bio?: string;
    city?: string;
    interests: string[];
    dataSaverEnabled?: boolean;
    invisibleMode?: boolean;
  };

  const profile = await prisma.profile.update({
    where: { userId },
    data: { displayName, bio, city, interests }
  });

  await prisma.user.update({
    where: { id: userId },
    data: { dataSaverEnabled, invisibleMode }
  });

  res.json(profile);
}

export async function verifyIdentity(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { selfieVideoUrl, statement } = req.body as { selfieVideoUrl?: string; statement?: string };

  const normalizedStatement = String(statement ?? "").trim();
  const normalizedVideo = String(selfieVideoUrl ?? "").trim();

  if (!normalizedVideo) {
    throw new ApiError(400, "Video selfie requis pour la verification.");
  }

  const isAcceptedSource = normalizedVideo.startsWith("data:video/") || normalizedVideo.startsWith("https://") || normalizedVideo.startsWith("http://");
  if (!isAcceptedSource) {
    throw new ApiError(400, "Format video non supporte.");
  }

  if (normalizedStatement.length < 8) {
    throw new ApiError(400, "Ajoutez une courte phrase de verification.");
  }

  const profile = await prisma.profile.update({
    where: { userId },
    data: { verifiedBadge: false }
  });

  await writeAuditLog({
    userId,
    action: "IDENTITY_VERIFICATION_SUBMITTED",
    method: req.method,
    path: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
    statusCode: 200,
    metadata: {
      statement: normalizedStatement,
      videoKind: normalizedVideo.startsWith("data:") ? "inline-data-url" : "remote-url",
      reviewStatus: "PENDING"
    }
  });

  res.json({ ok: true, verifiedBadge: profile.verifiedBadge, verificationStatus: "pending" });
}
