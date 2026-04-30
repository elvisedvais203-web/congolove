import { Response } from "express";
import { AuthRequest } from "../middleware/nextalkauth";
import { prisma } from "../config/nextalkdb";
import { writeAuditLog } from "../services/nextalkaudit.service";
import { ApiError } from "../utils/nextalkapierror";
import { AppLanguage, AppTheme, ChatTheme, MessagePolicy, ProfileVisibility, StoryVisibility, VoiceTranscriptMode } from "@prisma/client";

export async function myProfile(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          settings: true,
          photos: true,
          followers: { where: { approved: true }, select: { id: true } },
          following: { where: { approved: true }, select: { id: true } },
          id: true,
          phone: true,
          email: true,
          planTier: true,
          reputation: true,
          dataSaverEnabled: true,
          invisibleMode: true
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
    followersCount: profile?.user?.followers?.length ?? 0,
    followingCount: profile?.user?.following?.length ?? 0,
    verificationStatus,
    latestVerificationRequestedAt: latestVerificationSubmission?.createdAt ?? null,
    latestVerificationReviewedAt: latestVerificationReview?.createdAt ?? null
  });
}

export async function updateProfile(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { displayName, bio, city, interests, latitude, longitude, dataSaverEnabled, invisibleMode } = req.body as {
    displayName?: string;
    bio?: string;
    city?: string;
    interests?: string[];
    latitude?: number;
    longitude?: number;
    dataSaverEnabled?: boolean;
    invisibleMode?: boolean;
  };

  const profile = await prisma.profile.upsert({
    where: { userId },
    create: {
      userId,
      displayName: String(displayName ?? "Utilisateur"),
      bio,
      city,
      interests: Array.isArray(interests) ? interests : []
    },
    update: {
      ...(displayName !== undefined ? { displayName } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(interests !== undefined ? { interests } : {}),
      ...(latitude !== undefined ? { latitude } : {}),
      ...(longitude !== undefined ? { longitude } : {})
    }
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      ...(dataSaverEnabled !== undefined ? { dataSaverEnabled } : {}),
      ...(invisibleMode !== undefined ? { invisibleMode } : {})
    }
  });

  res.json(profile);
}

export async function updateProfileSettings(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const body = req.body as {
    language?: "FR" | "SW" | "EN";
    theme?: "dark" | "light";
    chatTheme?: "classic" | "aqua" | "sunset";
    chatAnimations?: boolean;
    readReceipts?: boolean;
    autoSaveMedia?: boolean;
    voiceTranscriptMode?: "NEVER" | "MANUAL";
    profileVisibility?: "VISIBLE" | "HIDDEN";
    messagePolicy?: "ALL" | "MATCH_ONLY";
    hideOnlineStatus?: boolean;
    notifMessages?: boolean;
    notifLikes?: boolean;
    notifCalls?: boolean;
    storyVisibility?: "PUBLIC" | "FOLLOWERS";
  };

  const settings = await prisma.userSettings.upsert({
    where: { userId },
    create: {
      userId,
      language: (body.language ?? "FR") as AppLanguage,
      theme: ((body.theme ?? "dark").toUpperCase() === "LIGHT" ? "LIGHT" : "DARK") as AppTheme,
      chatTheme: (body.chatTheme ?? "classic").toUpperCase() as ChatTheme,
      chatAnimations: body.chatAnimations ?? true,
      readReceipts: body.readReceipts ?? true,
      autoSaveMedia: body.autoSaveMedia ?? false,
      voiceTranscriptMode: (body.voiceTranscriptMode ?? "NEVER") as VoiceTranscriptMode,
      profileVisibility: (body.profileVisibility ?? "VISIBLE") as ProfileVisibility,
      messagePolicy: (body.messagePolicy ?? "MATCH_ONLY") as MessagePolicy,
      hideOnlineStatus: body.hideOnlineStatus ?? false,
      notifMessages: body.notifMessages ?? true,
      notifLikes: body.notifLikes ?? true,
      notifCalls: body.notifCalls ?? true,
      storyVisibility: (body.storyVisibility ?? "PUBLIC") as StoryVisibility
    },
    update: {
      ...(body.language !== undefined ? { language: body.language as AppLanguage } : {}),
      ...(body.theme !== undefined ? { theme: (body.theme.toUpperCase() === "LIGHT" ? "LIGHT" : "DARK") as AppTheme } : {}),
      ...(body.chatTheme !== undefined ? { chatTheme: body.chatTheme.toUpperCase() as ChatTheme } : {}),
      ...(body.chatAnimations !== undefined ? { chatAnimations: body.chatAnimations } : {}),
      ...(body.readReceipts !== undefined ? { readReceipts: body.readReceipts } : {}),
      ...(body.autoSaveMedia !== undefined ? { autoSaveMedia: body.autoSaveMedia } : {}),
      ...(body.voiceTranscriptMode !== undefined ? { voiceTranscriptMode: body.voiceTranscriptMode as VoiceTranscriptMode } : {}),
      ...(body.profileVisibility !== undefined ? { profileVisibility: body.profileVisibility as ProfileVisibility } : {}),
      ...(body.messagePolicy !== undefined ? { messagePolicy: body.messagePolicy as MessagePolicy } : {}),
      ...(body.hideOnlineStatus !== undefined ? { hideOnlineStatus: body.hideOnlineStatus } : {}),
      ...(body.notifMessages !== undefined ? { notifMessages: body.notifMessages } : {}),
      ...(body.notifLikes !== undefined ? { notifLikes: body.notifLikes } : {}),
      ...(body.notifCalls !== undefined ? { notifCalls: body.notifCalls } : {}),
      ...(body.storyVisibility !== undefined ? { storyVisibility: body.storyVisibility as StoryVisibility } : {})
    }
  });

  await prisma.profile.updateMany({
    where: { userId },
    data: { isPrivate: settings.profileVisibility === "HIDDEN" }
  });

  res.json(settings);
}

export async function addProfilePhoto(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { mediaUrl, makePrimary } = req.body as { mediaUrl?: string; makePrimary?: boolean };
  const normalized = String(mediaUrl ?? "").trim();
  if (!normalized || !normalized.startsWith("http")) {
    throw new ApiError(400, "URL photo invalide.");
  }

  const photo = await prisma.$transaction(async (tx) => {
    if (makePrimary) {
      await tx.photo.updateMany({ where: { userId, isPrimary: true }, data: { isPrimary: false } });
    }
    return tx.photo.create({
      data: {
        userId,
        url: normalized,
        isPrimary: Boolean(makePrimary)
      }
    });
  });

  res.status(201).json(photo);
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

export async function deleteMyAccount(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { confirmation } = req.body as { confirmation?: string };

  if (String(confirmation ?? "").trim().toUpperCase() !== "SUPPRIMER") {
    throw new ApiError(400, "Confirmation invalide.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        userId,
        action: "ACCOUNT_DELETION_REQUESTED",
        method: req.method,
        path: req.originalUrl,
        ipAddress: req.ip,
        userAgent: req.get("user-agent") ?? undefined,
        statusCode: 200,
        metadata: { source: "settings" }
      }
    });

    await tx.user.delete({ where: { id: userId } });
  });

  res.json({ ok: true });
}
