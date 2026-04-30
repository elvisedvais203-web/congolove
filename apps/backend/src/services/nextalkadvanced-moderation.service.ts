import { prisma } from "../config/nextalkdb";

export enum ContentClassification {
  SAFE = "SAFE",
  SUSPICIOUS = "SUSPICIOUS",
  TOXIC = "TOXIC",
  HATE_SPEECH = "HATE_SPEECH",
  SEXUAL_CONTENT = "SEXUAL_CONTENT",
  VIOLENCE = "VIOLENCE",
  SPAM = "SPAM",
  SCAM = "SCAM"
}

export enum ModerationSeverity {
  LOW = "LOW",           // Info only, no action needed
  MEDIUM = "MEDIUM",     // Warning + monitoring
  HIGH = "HIGH",         // Restrict + review
  CRITICAL = "CRITICAL"  // Immediate action
}

export type ContentAnalysisResult = {
  classification: ContentClassification;
  confidence: number;              // 0-100
  severity: ModerationSeverity;
  reasons: string[];
  toxicityScore: number;           // 0-100
  spamScore: number;               // 0-100
  scamScore: number;               // 0-100
  hateSpeechScore: number;         // 0-100
  sexualContentScore: number;      // 0-100
  violenceScore: number;           // 0-100
  suggestedAction: string;         // "NONE", "WARNING", "HIDE", "RESTRICT", "BAN"
  requiresHumanReview: boolean;
};

/**
 * Tokenize and clean text for analysis
 */
function preprocessText(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

/**
 * Dictionary-based toxic content detection
 */
function detectToxicity(text: string): { score: number; reasons: string[] } {
  const lowerText = text.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  // Insults and profanity patterns (French/English/Swahili)
  const toxicPatterns = [
    { pattern: /(con|salaud|débile|idiot|imbécile|nul)/gi, weight: 15, reason: "Insultes détectées" },
    { pattern: /(fuck|shit|damn|asshole)/gi, weight: 15, reason: "Langage abusif détecté" },
    { pattern: /(mwenyeji|wazimu|mjinga|wazimu)/gi, weight: 15, reason: "Langage insultant détecté" },
    { pattern: /kill|murder|beat you/gi, weight: 20, reason: "Menaces de violence détectées" },
    { pattern: /suicide|self-harm|slay yourself/gi, weight: 25, reason: "Contenu d'automutilation détecté" },
    { pattern: /your mom|your family|famille/gi, weight: 10, reason: "Insultes familiales détectées" }
  ];

  for (const { pattern, weight, reason } of toxicPatterns) {
    const matches = lowerText.match(pattern);
    if (matches) {
      score = Math.min(100, score + weight);
      if (!reasons.includes(reason)) reasons.push(reason);
    }
  }

  return { score, reasons };
}

/**
 * Detect hate speech and discriminatory content
 */
function detectHateSpeech(text: string): { score: number; reasons: string[] } {
  const lowerText = text.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  const hatefulPatterns = [
    { pattern: /(all.*are criminals|all.*are lazy|all.*are terrorists)/gi, weight: 30, reason: "Généralisation discriminatoire" },
    { pattern: /(n-word variations|race-based slurs)/gi, weight: 35, reason: "Langage racial détecté" },
    { pattern: /(gay|lesbian|trans|queer).*(disease|perverts|disgusting)/gi, weight: 25, reason: "Discours homophobe détecté" },
    { pattern: /(women|girls).*(inferior|stupid|belong)/gi, weight: 25, reason: "Sexisme détecté" },
    { pattern: /religious extremism|jihad|holy war/gi, weight: 30, reason: "Extrémisme religieux détecté" },
    { pattern: /(mussulmans|juifs|chrétiens).*(mauvais|ennemis|terroristes)/gi, weight: 30, reason: "Discours religieux haineux" }
  ];

  for (const { pattern, weight, reason } of hatefulPatterns) {
    if (pattern.test(lowerText)) {
      score = Math.min(100, score + weight);
      if (!reasons.includes(reason)) reasons.push(reason);
    }
  }

  return { score, reasons };
}

/**
 * Detect spam patterns
 */
function detectSpam(text: string): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Multiple links
  const links = text.match(/https?:\/\/|www\.|bit\.ly|short\.link/g)?.length || 0;
  if (links >= 2) {
    score += 20;
    reasons.push("Liens multiples détectés");
  }
  if (links >= 4) {
    score = Math.min(100, score + 30);
    reasons.push("Spam de liens excessif");
  }

  // Excessive capitalization
  const capsWords = (text.match(/[A-Z]{3,}/g) || []).length;
  if (capsWords >= 3) {
    score = Math.min(100, score + 15);
    reasons.push("Majuscules excessives");
  }

  // Repetitive characters
  if (/(.)\1{4,}/g.test(text)) {
    score = Math.min(100, score + 15);
    reasons.push("Caractères répétitifs détectés");
  }

  // Common spam keywords
  const spamKeywords = [
    "click here", "limited time", "act now", "buy now", "free money",
    "earn fast", "cliquez ici", "offre limitée", "acheter maintenant",
    "gagnez rapide", "argent facile", "faites clic", "bonyeza hapa"
  ];
  
  const lowerText = text.toLowerCase();
  for (const keyword of spamKeywords) {
    if (lowerText.includes(keyword)) {
      score = Math.min(100, score + 10);
      reasons.push("Mot-clé spam détecté");
      break;
    }
  }

  return { score, reasons };
}

/**
 * Detect sexual/NSFW content
 */
function detectSexualContent(text: string): { score: number; reasons: string[] } {
  const lowerText = text.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  const sexualPatterns = [
    { pattern: /(sex|porn|nudes|xxx|onlyfans|nude pics)/gi, weight: 30, reason: "Contenu sexuel détecté" },
    { pattern: /(escort|prostitute|sugar daddy|sugar mama)/gi, weight: 25, reason: "Contenu de transactional sexual détecté" },
    { pattern: /(send nudes|show body|sexy photos)/gi, weight: 35, reason: "Sollicitation de contenu sexuel" },
    { pattern: /(penis|vagina|breast|ass).*(big|huge|sexy)/gi, weight: 20, reason: "Contenu explicite détecté" }
  ];

  for (const { pattern, weight, reason } of sexualPatterns) {
    const matches = lowerText.match(pattern);
    if (matches) {
      score = Math.min(100, score + weight);
      if (!reasons.includes(reason)) reasons.push(reason);
    }
  }

  return { score, reasons };
}

/**
 * Detect scam/fraud patterns
 */
function detectScam(text: string): { score: number; reasons: string[] } {
  const lowerText = text.toLowerCase();
  const reasons: string[] = [];
  let score = 0;

  const scamPatterns = [
    { pattern: /(money transfer|western union|bitcoin|payment method)/gi, weight: 20, reason: "Demande de transfert d'argent" },
    { pattern: /(inheritance|lottery|prize|million dollars|vous avez gagné)/gi, weight: 35, reason: "Arnaque classique (héritage/loterie)" },
    { pattern: /(verify account|update payment|confirm identity|verify credentials)/gi, weight: 25, reason: "Phishing détecté" },
    { pattern: /(buy product|cheap deal|investment opportunity|guaranteed return)/gi, weight: 15, reason: "Offre douteuse détectée" },
    { pattern: /(send \$|wire \$|pay me|send money|deposit|fees)/gi, weight: 20, reason: "Demande de paiement suspecte" },
    { pattern: /(click link|download|install|verify|confirm now)/gi, weight: 10, reason: "Lien/téléchargement suspect" }
  ];

  for (const { pattern, weight, reason } of scamPatterns) {
    const matches = lowerText.match(pattern);
    if (matches) {
      score = Math.min(100, score + weight);
      if (!reasons.includes(reason)) reasons.push(reason);
    }
  }

  return { score, reasons };
}

/**
 * Main content analysis function
 */
export async function analyzeContent(text: string, userId?: string): Promise<ContentAnalysisResult> {
  if (!text || text.trim().length === 0) {
    return {
      classification: ContentClassification.SAFE,
      confidence: 100,
      severity: ModerationSeverity.LOW,
      reasons: [],
      toxicityScore: 0,
      spamScore: 0,
      scamScore: 0,
      hateSpeechScore: 0,
      sexualContentScore: 0,
      violenceScore: 0,
      suggestedAction: "NONE",
      requiresHumanReview: false
    };
  }

  const { score: toxicityScore, reasons: toxicityReasons } = detectToxicity(text);
  const { score: hateSpeechScore, reasons: hateSpeechReasons } = detectHateSpeech(text);
  const { score: spamScore, reasons: spamReasons } = detectSpam(text);
  const { score: sexualContentScore, reasons: sexualReasons } = detectSexualContent(text);
  const { score: scamScore, reasons: scamReasons } = detectScam(text);

  const allReasons = [
    ...toxicityReasons,
    ...hateSpeechReasons,
    ...spamReasons,
    ...sexualReasons,
    ...scamReasons
  ];

  // Determine primary classification
  let classification = ContentClassification.SAFE;
  let confidence = 100;

  if (hateSpeechScore >= 50) {
    classification = ContentClassification.HATE_SPEECH;
    confidence = hateSpeechScore;
  } else if (sexualContentScore >= 60) {
    classification = ContentClassification.SEXUAL_CONTENT;
    confidence = sexualContentScore;
  } else if (scamScore >= 60) {
    classification = ContentClassification.SCAM;
    confidence = scamScore;
  } else if (toxicityScore >= 70) {
    classification = ContentClassification.TOXIC;
    confidence = toxicityScore;
  } else if (spamScore >= 60) {
    classification = ContentClassification.SPAM;
    confidence = spamScore;
  } else if (toxicityScore > 20 || hateSpeechScore > 20 || spamScore > 20) {
    classification = ContentClassification.SUSPICIOUS;
    confidence = Math.max(toxicityScore, hateSpeechScore, spamScore, sexualContentScore, scamScore);
  }

  // Determine severity
  let severity = ModerationSeverity.LOW;
  if (classification === ContentClassification.SAFE) {
    severity = ModerationSeverity.LOW;
  } else if (confidence >= 80) {
    severity = classification === ContentClassification.HATE_SPEECH ? ModerationSeverity.CRITICAL : ModerationSeverity.HIGH;
  } else if (confidence >= 60) {
    severity = ModerationSeverity.HIGH;
  } else if (confidence >= 40) {
    severity = ModerationSeverity.MEDIUM;
  } else {
    severity = ModerationSeverity.LOW;
  }

  // Determine suggested action
  let suggestedAction = "NONE";
  let requiresHumanReview = false;

  if (classification === ContentClassification.HATE_SPEECH) {
    suggestedAction = "RESTRICT";
    requiresHumanReview = confidence < 90;
  } else if (classification === ContentClassification.SEXUAL_CONTENT && confidence >= 70) {
    suggestedAction = "HIDE";
    requiresHumanReview = confidence < 85;
  } else if (classification === ContentClassification.SCAM && confidence >= 75) {
    suggestedAction = "RESTRICT";
    requiresHumanReview = confidence < 90;
  } else if (classification === ContentClassification.TOXIC && confidence >= 75) {
    suggestedAction = "WARNING";
    requiresHumanReview = confidence < 85;
  } else if (classification === ContentClassification.SPAM && confidence >= 70) {
    suggestedAction = "HIDE";
    requiresHumanReview = true;
  } else if (classification === ContentClassification.SUSPICIOUS || severity === ModerationSeverity.MEDIUM) {
    suggestedAction = "NONE";
    requiresHumanReview = true;
  }

  return {
    classification,
    confidence,
    severity,
    reasons: allReasons,
    toxicityScore,
    spamScore,
    scamScore,
    hateSpeechScore,
    sexualContentScore,
    violenceScore: toxicityScore, // Can be enhanced with specific violence detection
    suggestedAction,
    requiresHumanReview
  };
}

/**
 * User behavior pattern analysis
 */
export async function analyzeUserBehavior(userId: string) {
  const now = new Date();
  const pastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const pastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Count messages in different time periods
  const messagesLast24h = await prisma.message.count({
    where: {
      senderId: userId,
      createdAt: { gte: pastDay }
    }
  });

  const messagesLastWeek = await prisma.message.count({
    where: {
      senderId: userId,
      createdAt: { gte: pastWeek }
    }
  });

  const chatMessages24h = await prisma.chatMessage.count({
    where: {
      senderId: userId,
      createdAt: { gte: pastDay }
    }
  });

  const chatMessagesWeek = await prisma.chatMessage.count({
    where: {
      senderId: userId,
      createdAt: { gte: pastWeek }
    }
  });

  // Reports and audit logs
  const reportsReceived = await prisma.userReport.count({
    where: { reportedUserId: userId }
  });

  const reportsReceivedMonth = await prisma.userReport.count({
    where: {
      reportedUserId: userId,
      createdAt: { gte: pastMonth }
    }
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: {
      userId,
      createdAt: { gte: pastMonth }
    }
  });

  // Get user info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      reportsReceived: { include: { reporter: true } }
    }
  });

  // Calculate behavior risk score
  let behaviorRiskScore = 0;

  // Message volume anomalies
  if (messagesLast24h > 30) behaviorRiskScore += 15;
  if (messagesLast24h > 60) behaviorRiskScore += 15;
  if (chatMessages24h > 50) behaviorRiskScore += 15;

  // Report patterns
  if (reportsReceivedMonth >= 3) behaviorRiskScore += 20;
  if (reportsReceivedMonth >= 5) behaviorRiskScore += 15;

  // Account age
  if (user && new Date().getTime() - user.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000) {
    behaviorRiskScore += 10; // New account
  }

  // Reputation
  if (user && user.reputation < 30) behaviorRiskScore += 10;

  // Multiple same-pattern reports
  if ((user?.reportsReceived?.length ?? 0) >= 2) {
    const reportReasons = (user?.reportsReceived ?? []).map((r) => r.reason.toLowerCase());
    const uniqueReasons = new Set(reportReasons).size;
    if (uniqueReasons === 1) {
      // All reports for same reason = coordinated abuse likely
      behaviorRiskScore += 15;
    }
  }

  // Spam indicators from audit logs
  const spamBlocks = auditLogs.filter((log) => log.action === "MESSAGE_BLOCKED_SPAM").length;
  if (spamBlocks >= 3) behaviorRiskScore += 15;
  if (spamBlocks >= 5) behaviorRiskScore += 10;

  return {
    userId,
    messagesLast24h,
    messagesLastWeek,
    chatMessages24h,
    chatMessagesWeek,
    reportsReceived,
    reportsReceivedMonth,
    spamBlocks,
    accountAgeMs: user ? new Date().getTime() - user.createdAt.getTime() : 0,
    reputation: user?.reputation ?? 50,
    behaviorRiskScore: Math.min(100, behaviorRiskScore),
    flags: {
      highMessageVolume: messagesLast24h > 30 || chatMessages24h > 50,
      multipleReports: reportsReceivedMonth >= 3,
      newAccount: user ? new Date().getTime() - user.createdAt.getTime() < 7 * 24 * 60 * 60 * 1000 : false,
      lowReputation: user ? user.reputation < 30 : false,
      spamPattern: spamBlocks >= 3,
      possibleCoordinatedAbuse: (user?.reportsReceived?.length ?? 0) >= 2 && new Set((user?.reportsReceived ?? []).map((r) => r.reason.toLowerCase())).size === 1
    }
  };
}

/**
 * Compare user behaviors to detect coordinated abuse
 */
export async function detectCoordinatedAbuse(targetUserId: string) {
  const reportsAgainst = await prisma.userReport.findMany({
    where: { reportedUserId: targetUserId },
    include: { reporter: true },
    take: 50
  });

  if (reportsAgainst.length < 3) {
    return {
      detected: false,
      confidence: 0,
      suspiciousReporters: [],
      susiciousReporters: []
    };
  }

  // Group by reason
  const byReason = new Map<string, string[]>();
  for (const report of reportsAgainst) {
    const reason = report.reason.toLowerCase();
    if (!byReason.has(reason)) byReason.set(reason, []);
    byReason.get(reason)!.push(report.reporter.id);
  }

  // Find suspicious patterns
  const suspiciousReporters: { userId: string; reason: string; count: number }[] = [];
  let coordinatedAbuseConfidence = 0;

  for (const [reason, reporterIds] of byReason.entries()) {
    if (reporterIds.length >= 3) {
      // Multiple reports with same reason = coordinated
      coordinatedAbuseConfidence = Math.min(100, coordinatedAbuseConfidence + 30);
      for (const reporterId of reporterIds) {
        suspiciousReporters.push({
          userId: reporterId,
          reason,
          count: reporterIds.filter((id) => id === reporterId).length
        });
      }
    }
  }

  // Check if reporters also report similar targets
  const reporterIds = [...new Set(reportsAgainst.map((r) => r.reporterId))];
  const theirReports = await prisma.userReport.findMany({
    where: {
      reporterId: { in: reporterIds },
      reportedUserId: { not: targetUserId }
    },
    select: { reportedUserId: true }
  });

  // Count how often same reporters report same targets
  const targetMap = new Map<string, number>();
  for (const report of theirReports) {
    targetMap.set(report.reportedUserId, (targetMap.get(report.reportedUserId) ?? 0) + 1);
  }

  if ([...targetMap.values()].some((count) => count >= 3)) {
    coordinatedAbuseConfidence = Math.min(100, coordinatedAbuseConfidence + 25);
  }

  return {
    detected: coordinatedAbuseConfidence >= 50,
    confidence: coordinatedAbuseConfidence,
    suspiciousReporters,
    susiciousReporters: suspiciousReporters
  };
}
