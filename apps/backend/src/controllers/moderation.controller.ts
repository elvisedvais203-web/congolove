import { Request, Response } from "express";
import { randomUUID } from "crypto";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../config/db";
import { writeAuditLog } from "../services/audit.service";

function computeRiskScore(input: { reputation: number; reportsCount: number; verifiedBadge: boolean; spamBlocks?: number; rejectedVerifications?: number }) {
  let score = 10;
  score += Math.max(0, 55 - input.reputation);
  score += input.reportsCount * 12;
  if (!input.verifiedBadge) {
    score += 10;
  }
  score += (input.spamBlocks ?? 0) * 14;
  score += (input.rejectedVerifications ?? 0) * 10;
  return Math.max(0, Math.min(100, score));
}

function buildRiskReasons(input: { reputation: number; reportsCount: number; verifiedBadge: boolean; spamBlocks: number; rejectedVerifications: number }) {
  const reasons: string[] = [];
  if (input.reportsCount > 0) reasons.push(`${input.reportsCount} signalement(s)`);
  if (input.spamBlocks > 0) reasons.push(`${input.spamBlocks} blocage(s) anti-spam`);
  if (input.rejectedVerifications > 0) reasons.push(`${input.rejectedVerifications} verification(s) refusee(s)`);
  if (!input.verifiedBadge) reasons.push("profil non verifie");
  if (input.reputation < 40) reasons.push("reputation basse");
  return reasons;
}

export async function reportUser(req: AuthRequest, res: Response) {
  const reporterId = req.user!.userId;
  const { reportedUserId, reason } = req.body as { reportedUserId: string; reason: string };

  const report = await prisma.userReport.create({
    data: { reporterId, reportedUserId, reason }
  });

  await prisma.user.update({
    where: { id: reportedUserId },
    data: { reputation: { decrement: 2 } }
  });

  await writeAuditLog({
    userId: reportedUserId,
    action: "USER_REPORTED",
    method: req.method,
    path: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
    statusCode: 201,
    metadata: {
      reporterId,
      reason
    }
  });

  res.status(201).json(report);
}

export async function adminStats(_req: AuthRequest, res: Response) {
  const [users, matches, messages, reports] = await Promise.all([
    prisma.user.count(),
    prisma.match.count(),
    prisma.message.count(),
    prisma.userReport.count()
  ]);

  res.json({ users, matches, messages, reports });
}

export async function suspiciousUsers(_req: AuthRequest, res: Response) {
  const users = await prisma.user.findMany({
    where: {
      OR: [{ reputation: { lt: 35 } }, { reportsReceived: { some: {} } }]
    },
    include: {
      profile: true,
      reportsReceived: true
    },
    take: 50,
    orderBy: { reputation: "asc" }
  });

  const auditRows = await prisma.auditLog.findMany({
    where: {
      userId: { in: users.map((user) => user.id) },
      action: { in: ["MESSAGE_BLOCKED_SPAM", "IDENTITY_VERIFICATION_REVIEWED"] }
    },
    orderBy: { createdAt: "desc" },
    take: 400
  });

  const spamBlocks = new Map<string, number>();
  const rejectedVerifications = new Map<string, number>();
  for (const row of auditRows) {
    if (!row.userId) continue;
    if (row.action === "MESSAGE_BLOCKED_SPAM") {
      spamBlocks.set(row.userId, (spamBlocks.get(row.userId) ?? 0) + 1);
    }
    if (row.action === "IDENTITY_VERIFICATION_REVIEWED") {
      const metadata = row.metadata as { decision?: string } | null;
      if (metadata?.decision === "REJECTED") {
        rejectedVerifications.set(row.userId, (rejectedVerifications.get(row.userId) ?? 0) + 1);
      }
    }
  }

  res.json(
    users.map((user) => ({
      ...user,
      riskScore: computeRiskScore({
        reputation: user.reputation,
        reportsCount: user.reportsReceived.length,
        verifiedBadge: user.profile?.verifiedBadge ?? false,
        spamBlocks: spamBlocks.get(user.id) ?? 0,
        rejectedVerifications: rejectedVerifications.get(user.id) ?? 0
      }),
      riskReasons: buildRiskReasons({
        reputation: user.reputation,
        reportsCount: user.reportsReceived.length,
        verifiedBadge: user.profile?.verifiedBadge ?? false,
        spamBlocks: spamBlocks.get(user.id) ?? 0,
        rejectedVerifications: rejectedVerifications.get(user.id) ?? 0
      })
    }))
  );
}

export async function adminUsers(_req: AuthRequest, res: Response) {
  const users = await prisma.user.findMany({
    include: {
      profile: true,
      reportsReceived: true
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const verificationLogs = await prisma.auditLog.findMany({
    where: {
      action: { in: ["IDENTITY_VERIFICATION_SUBMITTED", "IDENTITY_VERIFICATION_REVIEWED", "MESSAGE_BLOCKED_SPAM", "ACCOUNT_RESTRICTION_UPDATED"] }
    },
    orderBy: { createdAt: "desc" },
    take: 400
  });

  const submissionByUser = new Map<string, (typeof verificationLogs)[number]>();
  const reviewByUser = new Map<string, (typeof verificationLogs)[number]>();
  const restrictionByUser = new Map<string, (typeof verificationLogs)[number]>();
  const spamByUser = new Map<string, number>();

  for (const log of verificationLogs) {
    if (!log.userId) continue;
    if (log.action === "IDENTITY_VERIFICATION_SUBMITTED" && !submissionByUser.has(log.userId)) {
      submissionByUser.set(log.userId, log);
    }
    if (log.action === "IDENTITY_VERIFICATION_REVIEWED" && !reviewByUser.has(log.userId)) {
      reviewByUser.set(log.userId, log);
    }
    if (log.action === "MESSAGE_BLOCKED_SPAM") {
      spamByUser.set(log.userId, (spamByUser.get(log.userId) ?? 0) + 1);
    }
    if (log.action === "ACCOUNT_RESTRICTION_UPDATED" && !restrictionByUser.has(log.userId)) {
      restrictionByUser.set(log.userId, log);
    }
  }

  const data = users.map((user) => {
    const submission = submissionByUser.get(user.id) ?? null;
    const review = reviewByUser.get(user.id) ?? null;
    const reviewMetadata = review?.metadata as { decision?: "APPROVED" | "REJECTED"; note?: string } | null;
    const verificationStatus = submission && (!review || submission.createdAt > review.createdAt)
      ? "pending"
      : user.profile?.verifiedBadge
        ? "verified"
        : reviewMetadata?.decision === "REJECTED"
          ? "rejected"
          : "unverified";

    const rejectedVerifications = verificationLogs.filter((log) => log.userId === user.id && log.action === "IDENTITY_VERIFICATION_REVIEWED" && (log.metadata as { decision?: string } | null)?.decision === "REJECTED").length;
    const spamBlocks = spamByUser.get(user.id) ?? 0;
    const restriction = restrictionByUser.get(user.id) ?? null;
    const restrictionMetadata = restriction?.metadata as { status?: "ACTIVE" | "LIFTED"; type?: "SUSPENDED" | "BANNED"; until?: string | null; reason?: string } | null;

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      reputation: user.reputation,
      displayName: user.profile?.displayName ?? user.phone,
      city: user.profile?.city ?? null,
      verifiedBadge: user.profile?.verifiedBadge ?? false,
      verificationStatus,
      reportsCount: user.reportsReceived.length,
      riskScore: computeRiskScore({
        reputation: user.reputation,
        reportsCount: user.reportsReceived.length,
        verifiedBadge: user.profile?.verifiedBadge ?? false,
        spamBlocks,
        rejectedVerifications
      }),
      riskReasons: buildRiskReasons({
        reputation: user.reputation,
        reportsCount: user.reportsReceived.length,
        verifiedBadge: user.profile?.verifiedBadge ?? false,
        spamBlocks,
        rejectedVerifications
      }),
      restrictionStatus: restrictionMetadata?.status ?? null,
      restrictionType: restrictionMetadata?.type ?? null,
      restrictionUntil: restrictionMetadata?.until ?? null,
      restrictionReason: restrictionMetadata?.reason ?? null,
      latestVerificationRequestedAt: submission?.createdAt ?? null,
      latestReviewNote: reviewMetadata?.note ?? null
    };
  });

  res.json(data);
}

export async function adminReports(_req: AuthRequest, res: Response) {
  const reports = await prisma.userReport.findMany({
    include: {
      reporter: { include: { profile: true } },
      reportedUser: {
        include: {
          profile: true,
          reportsReceived: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  const reportUserIds = [...new Set(reports.map((item) => item.reportedUserId))];
  const auditRows = await prisma.auditLog.findMany({
    where: {
      userId: { in: reportUserIds },
      action: { in: ["MESSAGE_BLOCKED_SPAM", "IDENTITY_VERIFICATION_REVIEWED"] }
    },
    orderBy: { createdAt: "desc" },
    take: 400
  });

  const data = reports.map((report) => {
    const spamBlocks = auditRows.filter((row) => row.userId === report.reportedUserId && row.action === "MESSAGE_BLOCKED_SPAM").length;
    const rejectedVerifications = auditRows.filter((row) => row.userId === report.reportedUserId && row.action === "IDENTITY_VERIFICATION_REVIEWED" && (row.metadata as { decision?: string } | null)?.decision === "REJECTED").length;
    const riskScore = computeRiskScore({
      reputation: report.reportedUser.reputation,
      reportsCount: report.reportedUser.reportsReceived.length,
      verifiedBadge: report.reportedUser.profile?.verifiedBadge ?? false,
      spamBlocks,
      rejectedVerifications
    });

    return {
      id: report.id,
      reason: report.reason,
      createdAt: report.createdAt,
      reporter: {
        id: report.reporter.id,
        displayName: report.reporter.profile?.displayName ?? report.reporter.phone,
        phone: report.reporter.phone
      },
      reported: {
        id: report.reportedUser.id,
        displayName: report.reportedUser.profile?.displayName ?? report.reportedUser.phone,
        phone: report.reportedUser.phone,
        reputation: report.reportedUser.reputation,
        verifiedBadge: report.reportedUser.profile?.verifiedBadge ?? false,
        riskScore,
        riskReasons: buildRiskReasons({
          reputation: report.reportedUser.reputation,
          reportsCount: report.reportedUser.reportsReceived.length,
          verifiedBadge: report.reportedUser.profile?.verifiedBadge ?? false,
          spamBlocks,
          rejectedVerifications
        })
      }
    };
  });

  res.json(data);
}

export async function reviewVerification(req: AuthRequest, res: Response) {
  const adminUserId = req.user!.userId;
  const userId = String(req.params.userId);
  const { decision, note } = req.body as { decision: "APPROVED" | "REJECTED"; note?: string };

  const approved = decision === "APPROVED";

  await prisma.profile.update({
    where: { userId },
    data: { verifiedBadge: approved }
  });

  if (!approved) {
    await prisma.user.update({
      where: { id: userId },
      data: { reputation: { decrement: 3 } }
    });
  }

  await writeAuditLog({
    userId,
    action: "IDENTITY_VERIFICATION_REVIEWED",
    method: req.method,
    path: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
    statusCode: 200,
    metadata: {
      decision,
      note: String(note ?? "").trim(),
      reviewedBy: adminUserId
    }
  });

  res.json({ ok: true, decision, verifiedBadge: approved });
}

export async function updateAccountRestriction(req: AuthRequest, res: Response) {
  const adminUserId = req.user!.userId;
  const userId = String(req.params.userId);
  const { mode, reason, durationDays, note } = req.body as {
    mode: "SUSPEND" | "BAN" | "LIFT";
    reason?: string;
    durationDays?: number;
    note?: string;
  };

  if (!["SUSPEND", "BAN", "LIFT"].includes(mode)) {
    res.status(400).json({ message: "Mode invalide" });
    return;
  }

  const normalizedReason = String(reason ?? "").trim();
  if ((mode === "SUSPEND" || mode === "BAN") && normalizedReason.length < 6) {
    res.status(400).json({ message: "Motif obligatoire (minimum 6 caracteres)." });
    return;
  }

  const until = mode === "SUSPEND" && durationDays && durationDays > 0 ? new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString() : null;
  const status = mode === "LIFT" ? "LIFTED" : "ACTIVE";
  const type = mode === "BAN" ? "BANNED" : "SUSPENDED";

  await writeAuditLog({
    userId,
    action: "ACCOUNT_RESTRICTION_UPDATED",
    method: req.method,
    path: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
    statusCode: 200,
    metadata: {
      status,
      type,
      reason: normalizedReason || (mode === "BAN" ? "Bannissement admin" : mode === "SUSPEND" ? "Suspension admin" : "Restriction levee"),
      note: String(note ?? "").trim(),
      until,
      reviewedBy: adminUserId
    }
  });

  if (mode === "BAN" || mode === "SUSPEND") {
    await writeAuditLog({
      userId,
      action: "ACCOUNT_SESSION_INVALIDATED",
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      statusCode: 200,
      metadata: {
        reason: normalizedReason,
        triggeredBy: mode,
        reviewedBy: adminUserId
      }
    });
  }

  if (mode === "BAN") {
    await prisma.user.update({
      where: { id: userId },
      data: { reputation: { decrement: 10 } }
    });
  }

  res.json({ ok: true, mode, status, type, until });
}

export async function adminRestrictions(_req: AuthRequest, res: Response) {
  const logs = await prisma.auditLog.findMany({
    where: { action: "ACCOUNT_RESTRICTION_UPDATED" },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  const userIds = [...new Set(logs.map((log) => log.userId).filter(Boolean) as string[])];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: { profile: true }
      })
    : [];

  const byUser = new Map(users.map((user) => [user.id, user]));

  const data = logs.map((log) => {
    const metadata = (log.metadata ?? {}) as {
      status?: "ACTIVE" | "LIFTED";
      type?: "SUSPENDED" | "BANNED";
      reason?: string;
      note?: string;
      until?: string | null;
      reviewedBy?: string;
    };
    const user = log.userId ? byUser.get(log.userId) : null;

    return {
      id: log.id,
      userId: log.userId,
      displayName: user?.profile?.displayName ?? user?.phone ?? "Utilisateur inconnu",
      phone: user?.phone ?? null,
      email: user?.email ?? null,
      status: metadata.status ?? "ACTIVE",
      type: metadata.type ?? null,
      reason: metadata.reason ?? null,
      note: metadata.note ?? null,
      until: metadata.until ?? null,
      reviewedBy: metadata.reviewedBy ?? null,
      createdAt: log.createdAt
    };
  });

  res.json(data);
}

export async function submitAppeal(req: Request, res: Response) {
  const { identifier, message } = req.body as { identifier?: string; message?: string };
  const normalizedIdentifier = String(identifier ?? "").trim();
  const normalizedMessage = String(message ?? "").trim();

  if (!normalizedIdentifier || normalizedIdentifier.length < 4) {
    res.status(400).json({ message: "Identifiant requis (email ou telephone)." });
    return;
  }

  if (normalizedMessage.length < 20) {
    res.status(400).json({ message: "Message trop court (minimum 20 caracteres)." });
    return;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedIdentifier }, { phone: normalizedIdentifier }]
    },
    include: { profile: true }
  });

  const appealId = randomUUID();

  await writeAuditLog({
    userId: user?.id,
    action: "ACCOUNT_APPEAL_SUBMITTED",
    method: req.method,
    path: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
    statusCode: 201,
    metadata: {
      appealId,
      identifier: normalizedIdentifier,
      message: normalizedMessage,
      status: "OPEN",
      displayName: user?.profile?.displayName ?? null
    }
  });

  res.status(201).json({ ok: true, appealId });
}

export async function adminAppeals(_req: AuthRequest, res: Response) {
  const logs = await prisma.auditLog.findMany({
    where: {
      action: { in: ["ACCOUNT_APPEAL_SUBMITTED", "ACCOUNT_APPEAL_REVIEWED"] }
    },
    orderBy: { createdAt: "desc" },
    take: 300
  });

  const submitted = logs.filter((log) => log.action === "ACCOUNT_APPEAL_SUBMITTED");
  const reviewed = logs.filter((log) => log.action === "ACCOUNT_APPEAL_REVIEWED");

  const reviewsByAppealId = new Map<string, (typeof reviewed)[number]>();
  for (const row of reviewed) {
    const metadata = row.metadata as { appealId?: string } | null;
    const appealId = metadata?.appealId;
    if (!appealId || reviewsByAppealId.has(appealId)) continue;
    reviewsByAppealId.set(appealId, row);
  }

  const userIds = [...new Set(submitted.map((row) => row.userId).filter(Boolean) as string[])];
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        include: { profile: true, reportsReceived: true }
      })
    : [];
  const userById = new Map(users.map((user) => [user.id, user]));

  const auditRows = userIds.length
    ? await prisma.auditLog.findMany({
        where: {
          userId: { in: userIds },
          action: { in: ["MESSAGE_BLOCKED_SPAM", "IDENTITY_VERIFICATION_REVIEWED"] }
        },
        orderBy: { createdAt: "desc" },
        take: 800
      })
    : [];

  const spamBlocksByUser = new Map<string, number>();
  const rejectedVerificationsByUser = new Map<string, number>();

  for (const row of auditRows) {
    if (!row.userId) continue;
    if (row.action === "MESSAGE_BLOCKED_SPAM") {
      spamBlocksByUser.set(row.userId, (spamBlocksByUser.get(row.userId) ?? 0) + 1);
      continue;
    }
    if (row.action === "IDENTITY_VERIFICATION_REVIEWED") {
      const metadata = row.metadata as { decision?: string } | null;
      if (metadata?.decision === "REJECTED") {
        rejectedVerificationsByUser.set(row.userId, (rejectedVerificationsByUser.get(row.userId) ?? 0) + 1);
      }
    }
  }

  const data = submitted.map((row) => {
    const metadata = (row.metadata ?? {}) as {
      appealId?: string;
      identifier?: string;
      message?: string;
      status?: "OPEN" | "APPROVED" | "REJECTED";
    };

    const appealId = metadata.appealId ?? row.id;
    const review = reviewsByAppealId.get(appealId) ?? null;
    const reviewMetadata = (review?.metadata ?? {}) as {
      decision?: "APPROVED" | "REJECTED";
      note?: string;
      reviewedBy?: string;
    };
    const user = row.userId ? userById.get(row.userId) : null;
    const spamBlocks = row.userId ? spamBlocksByUser.get(row.userId) ?? 0 : 0;
    const rejectedVerifications = row.userId ? rejectedVerificationsByUser.get(row.userId) ?? 0 : 0;
    const reportsCount = user?.reportsReceived.length ?? 0;
    const riskScore = user
      ? computeRiskScore({
          reputation: user.reputation,
          reportsCount,
          verifiedBadge: user.profile?.verifiedBadge ?? false,
          spamBlocks,
          rejectedVerifications
        })
      : 35;
    const riskReasons = user
      ? buildRiskReasons({
          reputation: user.reputation,
          reportsCount,
          verifiedBadge: user.profile?.verifiedBadge ?? false,
          spamBlocks,
          rejectedVerifications
        })
      : ["identite non reliee au compte"];

    return {
      id: appealId,
      logId: row.id,
      userId: row.userId,
      displayName: user?.profile?.displayName ?? (row.userId ? user?.phone : null) ?? "Utilisateur inconnu",
      email: user?.email ?? null,
      phone: user?.phone ?? null,
      identifier: metadata.identifier ?? null,
      message: metadata.message ?? "",
      status: review ? reviewMetadata.decision ?? "OPEN" : metadata.status ?? "OPEN",
      reviewNote: reviewMetadata.note ?? null,
      reviewedBy: reviewMetadata.reviewedBy ?? null,
      submittedAt: row.createdAt,
      reviewedAt: review?.createdAt ?? null,
      riskScore,
      riskReasons
    };
  });

  res.json(data);
}

export async function resolveAppeal(req: AuthRequest, res: Response) {
  const adminUserId = req.user!.userId;
  const appealId = String(req.params.appealId ?? "").trim();
  const { decision, note } = req.body as { decision: "APPROVED" | "REJECTED"; note?: string };

  if (!appealId) {
    res.status(400).json({ message: "appealId requis" });
    return;
  }

  if (!decision || !["APPROVED", "REJECTED"].includes(decision)) {
    res.status(400).json({ message: "Decision invalide" });
    return;
  }

  const existingReview = await prisma.auditLog.findFirst({
    where: {
      action: "ACCOUNT_APPEAL_REVIEWED",
      metadata: {
        path: ["appealId"],
        equals: appealId
      }
    }
  });

  if (existingReview) {
    res.status(409).json({ message: "Ce recours a deja ete traite." });
    return;
  }

  const submitted = await prisma.auditLog.findFirst({
    where: {
      action: "ACCOUNT_APPEAL_SUBMITTED",
      metadata: {
        path: ["appealId"],
        equals: appealId
      }
    }
  });

  if (!submitted) {
    res.status(404).json({ message: "Recours introuvable" });
    return;
  }

  await writeAuditLog({
    userId: submitted.userId ?? undefined,
    action: "ACCOUNT_APPEAL_REVIEWED",
    method: req.method,
    path: req.originalUrl,
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? undefined,
    statusCode: 200,
    metadata: {
      appealId,
      decision,
      note: String(note ?? "").trim(),
      reviewedBy: adminUserId
    }
  });

  if (decision === "APPROVED" && submitted.userId) {
    await writeAuditLog({
      userId: submitted.userId,
      action: "ACCOUNT_RESTRICTION_UPDATED",
      method: req.method,
      path: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? undefined,
      statusCode: 200,
      metadata: {
        status: "LIFTED",
        type: "SUSPENDED",
        reason: "Recours accepte",
        note: String(note ?? "").trim(),
        reviewedBy: adminUserId,
        source: "APPEAL"
      }
    });
  }

  res.json({ ok: true, appealId, decision });
}

export async function reviewMessages(req: AuthRequest, res: Response) {
  const matchId = String(req.query.matchId ?? "");
  const messages = await prisma.message.findMany({
    where: matchId ? { matchId } : {},
    include: {
      sender: { include: { profile: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  res.json(messages);
}
