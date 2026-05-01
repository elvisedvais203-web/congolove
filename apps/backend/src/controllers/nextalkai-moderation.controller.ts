import { Request, Response } from "express";
import { AuthRequest } from "../middleware/nextalkauth";
import { prisma } from "../config/nextalkdb";
import { writeAuditLog } from "../services/nextalkaudit.service";
import {
  analyzeContent,
  analyzeUserBehavior,
  detectCoordinatedAbuse,
  ContentAnalysisResult,
  ContentClassification,
  ModerationSeverity
} from "../services/nextalkadvanced-moderation.service";

function getQueryString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : undefined;
  return undefined;
}

/**
 * Analyze content for moderation (AI-powered)
 * Can analyze: messages, chat messages, profile bios, stories
 */
export async function analyzeContentForModeration(req: Request, res: Response) {
  const { contentType, contentId, userId, text } = req.body as {
    contentType: "message" | "chatMessage" | "profile" | "story";
    contentId: string;
    userId?: string;
    text: string;
  };

  if (!contentType || !contentId || !text) {
    res.status(400).json({ message: "contentType, contentId et text requis" });
    return;
  }

  try {
    // Perform AI analysis
    const analysis = await analyzeContent(text, userId);

    // Save analysis to database
    const contentAnalysis = await prisma.contentAnalysis.create({
      data: {
        contentType,
        contentId,
        userId: userId || null,
        classification: analysis.classification,
        confidence: analysis.confidence,
        severity: analysis.severity,
        toxicityScore: analysis.toxicityScore,
        spamScore: analysis.spamScore,
        scamScore: analysis.scamScore,
        hateSpeechScore: analysis.hateSpeechScore,
        sexualContentScore: analysis.sexualContentScore,
        violenceScore: analysis.violenceScore,
        reasons: analysis.reasons,
        suggestedAction: analysis.suggestedAction,
        requiresHumanReview: analysis.requiresHumanReview
      }
    });

    // Create review queue entry if human review is needed
    if (analysis.requiresHumanReview) {
      const priority =
        analysis.severity === "CRITICAL"
          ? 3
          : analysis.severity === "HIGH"
            ? 2
            : 1;

      await prisma.moderationReviewQueue.create({
        data: {
          contentAnalysisId: contentAnalysis.id,
          userId: userId || null,
          contentType,
          contentId,
          status: "PENDING",
          priority
        }
      });
    }

    // Take auto-action if confidence is very high
    if (analysis.confidence >= 85 && userId) {
      if (analysis.suggestedAction === "BAN" || (analysis.classification === ContentClassification.HATE_SPEECH && analysis.confidence >= 95)) {
        await prisma.moderationAction.create({
          data: {
            userId,
            targetUserId: userId,
            actionType: "RESTRICT",
            reason: `Auto-moderation: ${analysis.reasons.join(", ")}`,
            severity: analysis.severity,
            contentAnalysisId: contentAnalysis.id,
            metadata: { autoTriggered: true, confidence: analysis.confidence },
            createdBy: "SYSTEM"
          }
        });

        await writeAuditLog({
          userId,
          action: "AUTO_MODERATION_ACTION_TAKEN",
          method: "POST",
          path: "/api/moderation/analyze",
          statusCode: 200,
          metadata: {
            contentType,
            classification: analysis.classification,
            confidence: analysis.confidence,
            actionType: "RESTRICT"
          }
        });
      }
    }

    res.json({
      analysis,
      saved: true,
      contentAnalysisId: contentAnalysis.id,
      reviewQueueId: analysis.requiresHumanReview ? contentAnalysis.id : null
    });
  } catch (error) {
    console.error("Error analyzing content:", error);
    res.status(500).json({ message: "Erreur lors de l'analyse du contenu" });
  }
}

/**
 * Get moderation review queue (for admins)
 */
export async function getReviewQueue(req: AuthRequest, res: Response) {
  const { status, priority, assignedTo, limit = 50, offset = 0 } = req.query as Record<string, any>;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (priority !== undefined) {
    where.priority = parseInt(priority);
  }

  if (assignedTo) {
    where.assignedTo = assignedTo;
  }

  try {
    const [items, total] = await Promise.all([
      prisma.moderationReviewQueue.findMany({
        where,
        include: {
          contentAnalysis: true,
          user: {
            select: {
              id: true,
              phone: true,
              email: true,
              profile: { select: { displayName: true } }
            }
          },
          assignedAdmin: {
            select: {
              id: true,
              phone: true,
              email: true,
              profile: { select: { displayName: true } }
            }
          }
        },
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: parseInt(limit),
        skip: parseInt(offset)
      }),
      prisma.moderationReviewQueue.count({ where })
    ]);

    res.json({
      items: items.map((item) => ({
        id: item.id,
        contentAnalysisId: item.contentAnalysisId,
        contentType: item.contentType,
        contentId: item.contentId,
        user: item.user
          ? {
              id: item.user.id,
              displayName: item.user.profile?.displayName || item.user.phone || item.user.email || "Utilisateur",
              phone: item.user.phone,
              email: item.user.email
            }
          : null,
        analysis: item.contentAnalysis,
        status: item.status,
        priority: item.priority,
        assignedTo: item.assignedAdmin
          ? {
              id: item.assignedAdmin.id,
              displayName: item.assignedAdmin.profile?.displayName || item.assignedAdmin.phone || item.assignedAdmin.email || "Utilisateur",
              phone: item.assignedAdmin.phone,
              email: item.assignedAdmin.email
            }
          : null,
        notes: item.notes,
        actionTaken: item.actionTaken,
        createdAt: item.createdAt,
        assignedAt: item.assignedAt,
        resolvedAt: item.resolvedAt
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + parseInt(limit) < total
      }
    });
  } catch (error) {
    console.error("Error fetching review queue:", error);
    res.status(500).json({ message: "Erreur lors de la récupération de la file d'attente" });
  }
}

/**
 * Assign review to admin
 */
export async function assignReview(req: AuthRequest, res: Response) {
  const adminId = req.user!.userId;
  const reviewId = String(req.params.reviewId);
  const { assignedToAdminId } = req.body;

  try {
    const review = await prisma.moderationReviewQueue.update({
      where: { id: reviewId },
      data: {
        assignedTo: assignedToAdminId,
        assignedAt: new Date()
      },
      include: { contentAnalysis: true }
    });

    await writeAuditLog({
      userId: adminId,
      action: "MODERATION_REVIEW_ASSIGNED",
      method: "POST",
      path: `/api/moderation/review/${reviewId}/assign`,
      statusCode: 200,
      metadata: {
        reviewId,
        assignedTo: assignedToAdminId,
        contentType: review.contentType
      }
    });

    res.json({ ok: true, review });
  } catch (error) {
    console.error("Error assigning review:", error);
    res.status(500).json({ message: "Erreur lors de l'assignation de la révision" });
  }
}

/**
 * Resolve review (approve or reject content)
 */
export async function resolveReview(req: AuthRequest, res: Response) {
  const adminId = req.user!.userId;
  const reviewId = String(req.params.reviewId);
  const { decision, actionType, notes, reason } = req.body as {
    decision: "APPROVED" | "REJECTED" | "ESCALATED";
    actionType?: string; // "NONE", "WARNING", "HIDE", "RESTRICT", "BAN"
    notes?: string;
    reason?: string;
  };

  try {
    const review = await prisma.moderationReviewQueue.findUnique({
      where: { id: reviewId },
      include: { contentAnalysis: true }
    });

    if (!review) {
      res.status(404).json({ message: "Révision non trouvée" });
      return;
    }

    // Update review queue
    const updatedReview = await prisma.moderationReviewQueue.update({
      where: { id: reviewId },
      data: {
        status: decision,
        actionTaken: actionType || null,
        notes: notes || null,
        resolvedAt: new Date()
      },
      include: { contentAnalysis: true }
    });

    // Take action if needed
    if (decision === "REJECTED" && actionType && review.contentAnalysis.userId) {
      const targetUserId = review.contentAnalysis.userId;
      const severity =
        actionType === "BAN"
          ? "CRITICAL"
          : actionType === "RESTRICT"
            ? "HIGH"
            : "MEDIUM";

      const moderationAction = await prisma.moderationAction.create({
        data: {
          userId: targetUserId,
          targetUserId,
          actionType,
          reason: reason || `Modération: ${review.contentAnalysis.classification}`,
          severity: severity as any,
          contentAnalysisId: review.contentAnalysisId,
          metadata: { reviewId, reviewNotes: notes },
          createdBy: adminId
        }
      });

      // If suspension/ban, reduce reputation
      if (actionType === "BAN") {
        await prisma.user.update({
          where: { id: targetUserId },
          data: { reputation: { decrement: 10 } }
        });
      } else if (actionType === "RESTRICT") {
        await prisma.user.update({
          where: { id: targetUserId },
          data: { reputation: { decrement: 5 } }
        });
      }
    }

    await writeAuditLog({
      userId: adminId,
      action: "MODERATION_REVIEW_RESOLVED",
      method: "POST",
      path: `/api/moderation/review/${reviewId}/resolve`,
      statusCode: 200,
      metadata: {
        reviewId,
        decision,
        actionType: actionType || "NONE",
        contentType: review.contentType,
        contentAnalysisId: review.contentAnalysisId
      }
    });

    res.json({ ok: true, review: updatedReview });
  } catch (error) {
    console.error("Error resolving review:", error);
    res.status(500).json({ message: "Erreur lors de la résolution de la révision" });
  }
}

/**
 * Analyze user behavior patterns for moderation
 */
export async function getUserBehaviorAnalysis(req: AuthRequest, res: Response) {
  const userId = String(req.params.userId);

  try {
    const behavior = await analyzeUserBehavior(userId);

    // Check for coordinated abuse
    const coordinatedAbuseCheck = await detectCoordinatedAbuse(userId);

    // Get or create behavior metric
    const metric = await prisma.userBehaviorMetric.upsert({
      where: { userId },
      update: {
        messagesLast24h: behavior.messagesLast24h,
        messagesLastWeek: behavior.messagesLastWeek,
        chatMessages24h: behavior.chatMessages24h,
        chatMessagesWeek: behavior.chatMessagesWeek,
        reportsReceived: behavior.reportsReceived,
        reportsReceivedMonth: behavior.reportsReceivedMonth,
        spamBlocks: behavior.spamBlocks,
        behaviorRiskScore: behavior.behaviorRiskScore,
        flagsData: behavior.flags
      },
      create: {
        userId,
        messagesLast24h: behavior.messagesLast24h,
        messagesLastWeek: behavior.messagesLastWeek,
        chatMessages24h: behavior.chatMessages24h,
        chatMessagesWeek: behavior.chatMessagesWeek,
        reportsReceived: behavior.reportsReceived,
        reportsReceivedMonth: behavior.reportsReceivedMonth,
        spamBlocks: behavior.spamBlocks,
        behaviorRiskScore: behavior.behaviorRiskScore,
        flagsData: behavior.flags
      }
    });

    // Create alert if coordinated abuse detected
    if (coordinatedAbuseCheck.detected && coordinatedAbuseCheck.confidence >= 60) {
      const existingAlert = await prisma.coordinatedAbuseAlert.findFirst({
        where: {
          targetUserId: userId,
          status: "PENDING"
        }
      });

      if (!existingAlert) {
        await prisma.coordinatedAbuseAlert.create({
          data: {
            targetUserId: userId,
            reportCount: 0,
            uniqueReportersCount: coordinatedAbuseCheck.susiciousReporters.length,
            pattern: "multiple_same_reason_reports",
            confidence: coordinatedAbuseCheck.confidence
          }
        });
      }
    }

    res.json({
      userId,
      behavior,
      coordinatedAbuseDetected: coordinatedAbuseCheck,
      metric
    });
  } catch (error) {
    console.error("Error analyzing user behavior:", error);
    res.status(500).json({ message: "Erreur lors de l'analyse du comportement" });
  }
}

/**
 * Get moderation metrics/dashboard
 */
export async function getModerationMetrics(req: AuthRequest, res: Response) {
  const dayCount = parseInt(getQueryString(req.query.days) ?? "7", 10);

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dayCount);

    // Get content analysis stats
    const contentStats = await prisma.contentAnalysis.groupBy({
      by: ["classification"],
      where: { createdAt: { gte: startDate } },
      _count: true
    });

    // Get moderation actions
    const actionStats = await prisma.moderationAction.groupBy({
      by: ["actionType"],
      where: { createdAt: { gte: startDate } },
      _count: true
    });

    // Get review queue stats
    const reviewStats = await Promise.all([
      prisma.moderationReviewQueue.count({ where: { status: "PENDING" } }),
      prisma.moderationReviewQueue.count({ where: { status: "APPROVED" } }),
      prisma.moderationReviewQueue.count({ where: { status: "REJECTED" } }),
      prisma.moderationReviewQueue.count({ where: { status: "ESCALATED" } })
    ]);

    // Get high-risk users
    const highRiskUsers = await prisma.userBehaviorMetric.findMany({
      where: {
        behaviorRiskScore: { gte: 60 }
      },
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            profile: { select: { displayName: true } }
          }
        }
      },
      orderBy: { behaviorRiskScore: "desc" },
      take: 20
    });

    // Get coordinated abuse alerts
    const abuseAlerts = await prisma.coordinatedAbuseAlert.findMany({
      where: {
        status: "PENDING",
        detectedAt: { gte: startDate }
      },
      include: {
        targetUser: {
          select: {
            id: true,
            phone: true,
            profile: { select: { displayName: true } }
          }
        }
      },
      orderBy: { confidence: "desc" },
      take: 20
    });

    // Get or create metrics entry
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const metrics = await prisma.moderationMetrics.upsert({
      where: { date: today },
      update: {
        totalContentAnalyzed: contentStats.reduce((sum, stat) => sum + stat._count, 0),
        toxicDetected: contentStats.find((s) => s.classification === "TOXIC")?._count || 0,
        hateSpeechDetected: contentStats.find((s) => s.classification === "HATE_SPEECH")?._count || 0,
        spamDetected: contentStats.find((s) => s.classification === "SPAM")?._count || 0,
        scamDetected: contentStats.find((s) => s.classification === "SCAM")?._count || 0,
        sexualContentDetected: contentStats.find((s) => s.classification === "SEXUAL_CONTENT")?._count || 0,
        actionsApproved: reviewStats[1],
        actionsRejected: reviewStats[2]
      },
      create: {
        date: today,
        totalContentAnalyzed: contentStats.reduce((sum, stat) => sum + stat._count, 0),
        toxicDetected: contentStats.find((s) => s.classification === "TOXIC")?._count || 0,
        hateSpeechDetected: contentStats.find((s) => s.classification === "HATE_SPEECH")?._count || 0,
        spamDetected: contentStats.find((s) => s.classification === "SPAM")?._count || 0,
        scamDetected: contentStats.find((s) => s.classification === "SCAM")?._count || 0,
        sexualContentDetected: contentStats.find((s) => s.classification === "SEXUAL_CONTENT")?._count || 0,
        actionsApproved: reviewStats[1],
        actionsRejected: reviewStats[2]
      }
    });

    res.json({
      period: {
        startDate,
        endDate: new Date(),
        days: dayCount
      },
      contentAnalysis: Object.fromEntries(contentStats.map((stat) => [stat.classification, stat._count])),
      moderationActions: Object.fromEntries(actionStats.map((stat) => [stat.actionType, stat._count])),
      reviewQueue: {
        pending: reviewStats[0],
        approved: reviewStats[1],
        rejected: reviewStats[2],
        escalated: reviewStats[3]
      },
      highRiskUsers: highRiskUsers.map((item) => ({
        id: item.user.id,
        displayName: item.user.profile?.displayName || item.user.phone,
        phone: item.user.phone,
        behaviorRiskScore: item.behaviorRiskScore,
        flags: item.flagsData
      })),
      coordinatedAbuseAlerts: abuseAlerts.map((alert) => ({
        id: alert.id,
        targetUser: {
          id: alert.targetUser.id,
          displayName: alert.targetUser.profile?.displayName || alert.targetUser.phone,
          phone: alert.targetUser.phone
        },
        reportCount: alert.reportCount,
        uniqueReportersCount: alert.uniqueReportersCount,
        confidence: alert.confidence,
        detectedAt: alert.detectedAt
      })),
      metrics
    });
  } catch (error) {
    console.error("Error getting moderation metrics:", error);
    res.status(500).json({ message: "Erreur lors de la récupération des métriques" });
  }
}

/**
 * Bulk analyze messages in a conversation
 */
export async function bulkAnalyzeMessages(req: AuthRequest, res: Response) {
  const { matchId, limit = 50 } = req.body as { matchId: string; limit?: number };

  try {
    const messages = await prisma.message.findMany({
      where: { matchId },
      include: { sender: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
      take: limit
    });

    const results = [];

    for (const message of messages) {
      if (message.text) {
        const analysis = await analyzeContent(message.text, message.senderId);

        // Save analysis
        const contentAnalysis = await prisma.contentAnalysis.create({
          data: {
            contentType: "message",
            contentId: message.id,
            userId: message.senderId,
            classification: analysis.classification,
            confidence: analysis.confidence,
            severity: analysis.severity,
            toxicityScore: analysis.toxicityScore,
            spamScore: analysis.spamScore,
            scamScore: analysis.scamScore,
            hateSpeechScore: analysis.hateSpeechScore,
            sexualContentScore: analysis.sexualContentScore,
            violenceScore: analysis.violenceScore,
            reasons: analysis.reasons,
            suggestedAction: analysis.suggestedAction,
            requiresHumanReview: analysis.requiresHumanReview
          }
        });

        // Create review if needed
        if (analysis.requiresHumanReview) {
          await prisma.moderationReviewQueue.create({
            data: {
              contentAnalysisId: contentAnalysis.id,
              userId: message.senderId,
              contentType: "message",
              contentId: message.id,
              status: "PENDING",
              priority:
                analysis.severity === "CRITICAL"
                  ? 3
                  : analysis.severity === "HIGH"
                    ? 2
                    : 1
            }
          });
        }

        results.push({
          messageId: message.id,
          senderId: message.senderId,
          analysis,
          contentAnalysisId: contentAnalysis.id
        });
      }
    }

    await writeAuditLog({
      userId: req.user!.userId,
      action: "BULK_MESSAGE_ANALYSIS",
      method: "POST",
      path: "/api/moderation/bulk-analyze",
      statusCode: 200,
      metadata: {
        matchId,
        messagesAnalyzed: results.length,
        reviewsCreated: results.filter((r) => r.analysis.requiresHumanReview).length
      }
    });

    res.json({
      matchId,
      totalAnalyzed: results.length,
      flagged: results.filter((r) => r.analysis.requiresHumanReview).length,
      results
    });
  } catch (error) {
    console.error("Error bulk analyzing messages:", error);
    res.status(500).json({ message: "Erreur lors de l'analyse groupée" });
  }
}

