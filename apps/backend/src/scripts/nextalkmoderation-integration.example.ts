#!/usr/bin/env node
/**
 * Advanced AI Moderation - Integration Guide
 * 
 * Ce fichier montre comment intégrer le système de modération IA avancée
 * dans différentes parties de l'application.
 */

// ============================================
// 1. MIDDLEWARE POUR ANALYSER LES MESSAGES
// ============================================

import { analyzeContent } from "../services/nextalkadvanced-moderation.service";

export async function moderationMiddleware(req: AuthRequest, res, next) {
  const { matchId, text } = req.body;
  
  if (text) {
    try {
      const analysis = await analyzeContent(text, req.user!.userId);
      
      // Bloquer les contenus hautement toxiques
      if (analysis.classification === 'HATE_SPEECH' && analysis.confidence >= 90) {
        return res.status(403).json({
          message: 'Ce message viole nos règles d\'utilisation',
          reason: analysis.reasons[0]
        });
      }
      
      // Ajouter l'analyse au body pour utilisation ultérieure
      req.body._contentAnalysis = analysis;
    } catch (error) {
      console.error('Moderation analysis error:', error);
      // Ne pas bloquer si l'analyse échoue
    }
  }
  
  next();
}

// Utiliser dans les routes de messages
router.post('/message', authGuard, moderationMiddleware, sendMessage);


// ============================================
// 2. ANALYSER LES MESSAGES EXISTANTS
// ============================================

import { analyzeContent } from "../services/nextalkadvanced-moderation.service";
import { prisma } from "../config/nextalkdb";

export async function scanConversation(matchId: string) {
  const messages = await prisma.message.findMany({
    where: { matchId },
    include: { sender: true }
  });
  
  const results = [];
  
  for (const message of messages) {
    if (message.text) {
      const analysis = await analyzeContent(message.text, message.senderId);
      
      // Sauvegarder l'analyse
      const contentAnalysis = await prisma.contentAnalysis.create({
        data: {
          contentType: 'message',
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
      
      // Créer item de révision si nécessaire
      if (analysis.requiresHumanReview) {
        await prisma.moderationReviewQueue.create({
          data: {
            contentAnalysisId: contentAnalysis.id,
            userId: message.senderId,
            contentType: 'message',
            contentId: message.id,
            status: 'PENDING',
            priority: analysis.severity === 'CRITICAL' ? 3 : 2
          }
        });
      }
      
      results.push({
        messageId: message.id,
        analysis
      });
    }
  }
  
  return results;
}


// ============================================
// 3. WEBHOOK POUR NOTIFIER LES ADMINS
// ============================================

export async function notifyModeratorsOfHighRiskContent(contentAnalysisId: string) {
  const analysis = await prisma.contentAnalysis.findUnique({
    where: { id: contentAnalysisId },
    include: { user: { select: { id: true, phone: true } } }
  });
  
  if (!analysis || !analysis.requiresHumanReview) return;
  
  // Envoyer une notification push aux admins
  const admins = await prisma.user.findMany({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] } },
    select: { id: true, firebaseUid: true }
  });
  
  for (const admin of admins) {
    if (admin.firebaseUid) {
      // Envoyer notification FCM
      await sendPushNotification(admin.firebaseUid, {
        title: 'Nouveau contenu à modérer',
        body: `${analysis.classification} - Confiance: ${analysis.confidence}%`,
        data: {
          contentAnalysisId,
          priority: analysis.severity
        }
      });
    }
  }
}


// ============================================
// 4. APPLIQUER LES ACTIONS AUTOMATIQUES
// ============================================

export async function autoApplyModerationAction(contentAnalysisId: string) {
  const analysis = await prisma.contentAnalysis.findUnique({
    where: { id: contentAnalysisId },
    include: { user: true }
  });
  
  if (!analysis || !analysis.userId) return;
  
  // Appliquer automatiquement pour haute confiance
  if (analysis.confidence >= 85 && analysis.severity === 'CRITICAL') {
    const action = await prisma.moderationAction.create({
      data: {
        userId: analysis.userId,
        targetUserId: analysis.userId,
        actionType: analysis.suggestedAction as any,
        reason: `Auto-moderation: ${analysis.reasons.join(', ')}`,
        severity: analysis.severity,
        contentAnalysisId: contentAnalysisId,
        metadata: {
          autoTriggered: true,
          confidence: analysis.confidence
        },
        createdBy: 'SYSTEM'
      }
    });
    
    // Envoyer notification à l'utilisateur
    await sendUserNotification(analysis.userId, {
      title: 'Action de modération appliquée',
      body: `Votre compte a été restreint suite à une violation`,
      type: 'MODERATION_ACTION'
    });
    
    return action;
  }
}


// ============================================
// 5. MONITORER UN UTILISATEUR SUSPECT
// ============================================

export async function monitorSuspiciousUser(userId: string) {
  const analysis = await analyzeUserBehavior(userId);
  
  // Créer ou mettre à jour les métriques
  const metric = await prisma.userBehaviorMetric.upsert({
    where: { userId },
    update: {
      messagesLast24h: analysis.messagesLast24h,
      messagesLastWeek: analysis.messagesLastWeek,
      behaviorRiskScore: analysis.behaviorRiskScore,
      flagsData: analysis.flags
    },
    create: {
      userId,
      ...analysis
    }
  });
  
  // Si très haut risque, notifier admins
  if (analysis.behaviorRiskScore >= 80) {
    await notifyAdmins({
      type: 'HIGH_RISK_USER',
      userId,
      riskScore: analysis.behaviorRiskScore,
      flags: analysis.flags
    });
  }
  
  return metric;
}


// ============================================
// 6. DÉTECTER LES ABUS COORDONNÉS
// ============================================

export async function monitorCoordinatedAbuse(targetUserId: string) {
  const coordinatedCheck = await detectCoordinatedAbuse(targetUserId);
  
  if (coordinatedCheck.detected && coordinatedCheck.confidence >= 60) {
    // Créer une alerte
    const alert = await prisma.coordinatedAbuseAlert.create({
      data: {
        targetUserId,
        reportCount: 0,
        uniqueReportersCount: coordinatedCheck.susiciousReporters.length,
        pattern: 'multiple_same_reason_reports',
        confidence: coordinatedCheck.confidence
      }
    });
    
    // Notifier les enquêteurs
    await notifyModerationTeam({
      type: 'COORDINATED_ABUSE_DETECTED',
      targetUserId,
      confidence: coordinatedCheck.confidence,
      alertId: alert.id
    });
    
    return alert;
  }
}


// ============================================
// 7. DASHBOARD POUR LES MODÉRATEURS
// ============================================

export async function getModerationDashboard(days: number = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  
  // Stats par classification
  const contentStats = await prisma.contentAnalysis.groupBy({
    by: ['classification'],
    where: { createdAt: { gte: startDate } },
    _count: true
  });
  
  // Items en attente de révision
  const pendingReviews = await prisma.moderationReviewQueue.findMany({
    where: { status: 'PENDING' },
    include: { contentAnalysis: true, user: true },
    orderBy: { priority: 'desc' },
    take: 20
  });
  
  // Utilisateurs à haut risque
  const highRiskUsers = await prisma.userBehaviorMetric.findMany({
    where: { behaviorRiskScore: { gte: 70 } },
    include: { user: true },
    orderBy: { behaviorRiskScore: 'desc' },
    take: 20
  });
  
  // Alertes d'abus coordonnés
  const abuseAlerts = await prisma.coordinatedAbuseAlert.findMany({
    where: { status: 'PENDING' },
    include: { targetUser: true },
    orderBy: { confidence: 'desc' },
    take: 10
  });
  
  return {
    period: { startDate, days },
    contentStats: Object.fromEntries(
      contentStats.map(s => [s.classification, s._count])
    ),
    pendingReviews,
    highRiskUsers,
    abuseAlerts
  };
}


// ============================================
// 8. SCRIPT DE MAINTENANCE JOURNALIER
// ============================================

export async function dailyModerationMaintenance() {
  console.log('🔄 Démarrage de la maintenance de modération...');
  
  // 1. Analyser les nouveaux utilisateurs suspects
  const newUsers = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    }
  });
  
  console.log(`📊 Analyse de ${newUsers.length} nouveaux utilisateurs`);
  for (const user of newUsers) {
    await monitorSuspiciousUser(user.id);
  }
  
  // 2. Vérifier les alertes d'abus coordonnés
  const reportedUsers = await prisma.user.findMany({
    where: {
      reportsReceived: {
        some: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }
    }
  });
  
  console.log(`⚠️  Vérification de ${reportedUsers.length} utilisateurs signalés`);
  for (const user of reportedUsers) {
    await monitorCoordinatedAbuse(user.id);
  }
  
  // 3. Générer un rapport quotidien
  const metrics = await getModerationDashboard(1);
  console.log('📈 Métriques du jour:', metrics);
  
  console.log('✅ Maintenance terminée');
  
  return metrics;
}

// Schedular avec node-cron
import cron from 'node-cron';

// Exécuter à 02:00 du matin chaque jour
cron.schedule('0 2 * * *', () => {
  dailyModerationMaintenance().catch(err => 
    console.error('Maintenance error:', err)
  );
});


// ============================================
// 9. EXPORTER LES DONNÉES POUR AUDIT
// ============================================

export async function exportModerationAudit(startDate: Date, endDate: Date) {
  const analyses = await prisma.contentAnalysis.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    include: { user: true }
  });
  
  const actions = await prisma.moderationAction.findMany({
    where: {
      createdAt: { gte: startDate, lte: endDate }
    },
    include: { user: true, targetUser: true }
  });
  
  const csv = [
    'Type,ContentType,Classification,Confidence,ActionTaken,CreatedAt',
    ...analyses.map(a => 
      `ANALYSIS,${a.contentType},${a.classification},${a.confidence},,${a.createdAt}`
    ),
    ...actions.map(a =>
      `ACTION,,${a.actionType},,,${a.createdAt}`
    )
  ].join('\n');
  
  return csv;
}


// ============================================
// 10. TESTER LA MODÉRATION
// ============================================

export async function testModerationSystem() {
  console.log('🧪 Tests du système de modération...');
  
  const testCases = [
    {
      text: 'Allez vous faire foutre!',
      expectedClassification: 'TOXIC',
      expectedHighConfidence: true
    },
    {
      text: 'Tous les [groupe] sont des criminels',
      expectedClassification: 'HATE_SPEECH',
      expectedHighConfidence: true
    },
    {
      text: 'Cliquez ici http://spam.com http://malware.com http://phishing.com',
      expectedClassification: 'SPAM',
      expectedHighConfidence: true
    },
    {
      text: 'Comment tu vas?',
      expectedClassification: 'SAFE',
      expectedHighConfidence: false
    }
  ];
  
  for (const testCase of testCases) {
    const analysis = await analyzeContent(testCase.text);
    const passed = 
      analysis.classification === testCase.expectedClassification &&
      (testCase.expectedHighConfidence ? analysis.confidence >= 70 : true);
    
    console.log(
      passed ? '✅' : '❌',
      `${testCase.text.substring(0, 30)}... → ${analysis.classification}`
    );
  }
}

// Exécuter les tests
// testModerationSystem();
