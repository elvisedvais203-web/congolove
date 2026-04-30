# Système de Modération IA Avancée - Kongo Love

## Vue d'ensemble

Le système de modération IA avancée est une solution complète pour détecter et gérer les contenus nuisibles, les abus et les violations des conditions d'utilisation sur la plateforme Kongo Love.

### Caractéristiques principales

✅ **Classification IA** - Détection automatique de contenu toxique, spam, harcèlement, etc.
✅ **Analyse comportementale** - Identification des utilisateurs à risque basée sur les patterns
✅ **Détection d'abus coordonnés** - Détection de campagnes de harcèlement organisées
✅ **File de révision humaine** - Système de triage pour les content modérateurs
✅ **Actions automatiques** - Application des mesures basées sur la confiance
✅ **Métriques et analytique** - Tableau de bord pour le suivi de la modération
✅ **Appeal system** - Recours pour les utilisateurs contre les actions

## Architecture

### Services

#### 1. **advanced-moderation.service.ts**
Service principal contenant la logique d'analyse IA:

```typescript
// Classification de contenu
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

// Sévérité de la violation
export enum ModerationSeverity {
  LOW = "LOW",           // Information seulement
  MEDIUM = "MEDIUM",     // Avertissement + monitoring
  HIGH = "HIGH",         // Restriction + révision
  CRITICAL = "CRITICAL"  // Action immédiate
}
```

**Fonctions principales:**

- `analyzeContent(text, userId)` - Analyse un contenu texte
- `analyzeUserBehavior(userId)` - Analyse le comportement d'un utilisateur
- `detectCoordinatedAbuse(targetUserId)` - Détecte les campagnes d'abus

#### 2. **ai-moderation.controller.ts**
Endpoints pour les opérations de modération:

- `analyzeContentForModeration` - Analyser du contenu
- `getReviewQueue` - Récupérer la file de révision
- `resolveReview` - Approuver/rejeter une révision
- `getUserBehaviorAnalysis` - Analyser un utilisateur
- `getModerationMetrics` - Métriques du tableau de bord

## Modèles de base de données

### ContentAnalysis
Stocke les résultats d'analyse d'un contenu:

```typescript
{
  id: string;
  contentType: "message" | "chatMessage" | "profile" | "story";
  contentId: string;
  userId?: string;
  classification: ContentClassification;
  confidence: number;      // 0-100
  severity: ModerationSeverity;
  toxicityScore: number;   // 0-100
  spamScore: number;
  scamScore: number;
  hateSpeechScore: number;
  sexualContentScore: number;
  violenceScore: number;
  reasons: string[];
  suggestedAction: string;
  requiresHumanReview: boolean;
  reviewedAt?: DateTime;
  reviewedBy?: string;
  createdAt: DateTime;
}
```

### ModerationReviewQueue
File d'attente pour révision humaine:

```typescript
{
  id: string;
  contentAnalysisId: string;
  userId?: string;
  contentType: string;
  contentId: string;
  status: ReviewStatus;  // PENDING | APPROVED | REJECTED | ESCALATED
  priority: number;      // 0=low, 1=medium, 2=high, 3=critical
  assignedTo?: string;   // admin userId
  notes?: string;
  actionTaken?: string;
  createdAt: DateTime;
  assignedAt?: DateTime;
  resolvedAt?: DateTime;
}
```

### ModerationAction
Actions prises contre les utilisateurs:

```typescript
{
  id: string;
  userId: string;
  targetUserId: string;
  actionType: "WARNING" | "HIDE_CONTENT" | "RESTRICT" | "SUSPEND" | "BAN";
  reason: string;
  severity: ModerationSeverity;
  duration?: number;     // en jours
  createdBy: string;     // admin userId
  createdAt: DateTime;
  expiresAt?: DateTime;
}
```

### UserBehaviorMetric
Métriques comportementales de l'utilisateur:

```typescript
{
  id: string;
  userId: string;
  messagesLast24h: number;
  messagesLastWeek: number;
  chatMessages24h: number;
  chatMessagesWeek: number;
  reportsReceived: number;
  reportsReceivedMonth: number;
  spamBlocks: number;
  behaviorRiskScore: number;  // 0-100
  flagsData: {
    highMessageVolume: boolean;
    multipleReports: boolean;
    newAccount: boolean;
    lowReputation: boolean;
    spamPattern: boolean;
    possibleCoordinatedAbuse: boolean;
  };
  lastAnalyzedAt: DateTime;
}
```

### ModerationMetrics
Statistiques quotidiennes:

```typescript
{
  id: string;
  date: DateTime;
  totalContentAnalyzed: number;
  toxicDetected: number;
  hateSpeechDetected: number;
  spamDetected: number;
  scamDetected: number;
  sexualContentDetected: number;
  actionsApproved: number;
  actionsRejected: number;
  averageReviewTime: number;  // en secondes
  autoActionsTaken: number;
}
```

### CoordinatedAbuseAlert
Alertes pour campagnes d'abus:

```typescript
{
  id: string;
  targetUserId: string;
  reportCount: number;
  uniqueReportersCount: number;
  pattern: string;
  confidence: number;  // 0-100
  status: ReviewStatus;
  investigatedBy?: string;
  notes?: string;
  detectedAt: DateTime;
  resolvedAt?: DateTime;
}
```

## API Endpoints

### Analyse de contenu

#### POST `/moderation/ai/analyze`
Analyser un contenu pour déterminer s'il viole les règles.

**Body:**
```json
{
  "contentType": "message",
  "contentId": "msg-123",
  "userId": "user-456",
  "text": "Le contenu à analyser..."
}
```

**Réponse:**
```json
{
  "analysis": {
    "classification": "TOXIC",
    "confidence": 85,
    "severity": "HIGH",
    "toxicityScore": 85,
    "spamScore": 10,
    "reasons": ["Insultes détectées"],
    "suggestedAction": "RESTRICT",
    "requiresHumanReview": true
  },
  "saved": true,
  "contentAnalysisId": "analysis-789",
  "reviewQueueId": "analysis-789"
}
```

### File de révision (Admin)

#### GET `/moderation/ai/queue`
Récupérer la file de révision avec filtrage.

**Query parameters:**
- `status` - PENDING, APPROVED, REJECTED, ESCALATED
- `priority` - 0, 1, 2, 3
- `assignedTo` - userId
- `limit` - nombre de résultats (défaut: 50)
- `offset` - décalage pour pagination

**Réponse:**
```json
{
  "items": [
    {
      "id": "review-123",
      "contentType": "message",
      "contentId": "msg-456",
      "user": {
        "id": "user-789",
        "displayName": "John Doe",
        "phone": "+243991234567"
      },
      "analysis": {
        "classification": "TOXIC",
        "confidence": 85,
        "severity": "HIGH",
        "reasons": ["Insultes détectées"]
      },
      "status": "PENDING",
      "priority": 2,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

#### POST `/moderation/ai/review/:reviewId/assign`
Assigner une révision à un modérateur.

**Body:**
```json
{
  "assignedToAdminId": "admin-user-123"
}
```

#### POST `/moderation/ai/review/:reviewId/resolve`
Résoudre une révision (approuver ou rejeter).

**Body:**
```json
{
  "decision": "REJECTED",
  "actionType": "RESTRICT",
  "reason": "Contenu toxique confirmé",
  "notes": "Compte déjà averti 2 fois"
}
```

### Analyse comportementale (Admin)

#### GET `/moderation/ai/user/:userId/behavior`
Analyser le comportement d'un utilisateur.

**Réponse:**
```json
{
  "userId": "user-123",
  "behavior": {
    "messagesLast24h": 45,
    "messagesLastWeek": 250,
    "chatMessages24h": 120,
    "reportsReceivedMonth": 5,
    "spamBlocks": 3,
    "behaviorRiskScore": 72,
    "flags": {
      "highMessageVolume": true,
      "multipleReports": true,
      "spamPattern": true,
      "possibleCoordinatedAbuse": false
    }
  },
  "coordinatedAbuseDetected": {
    "detected": true,
    "confidence": 65,
    "susiciousReporters": [...]
  }
}
```

### Métriques (Admin)

#### GET `/moderation/ai/metrics?days=7`
Récupérer le tableau de bord des métriques.

**Réponse:**
```json
{
  "period": {
    "startDate": "2024-01-08T00:00:00Z",
    "endDate": "2024-01-15T00:00:00Z",
    "days": 7
  },
  "contentAnalysis": {
    "SAFE": 8500,
    "TOXIC": 150,
    "HATE_SPEECH": 45,
    "SPAM": 320,
    "SCAM": 25,
    "SUSPICIOUS": 180
  },
  "moderationActions": {
    "WARNING": 30,
    "RESTRICT": 15,
    "SUSPEND": 8,
    "BAN": 2
  },
  "reviewQueue": {
    "pending": 25,
    "approved": 120,
    "rejected": 45,
    "escalated": 8
  },
  "highRiskUsers": [
    {
      "id": "user-123",
      "displayName": "Suspicious User",
      "behaviorRiskScore": 85,
      "flags": {
        "highMessageVolume": true,
        "multipleReports": true
      }
    }
  ],
  "coordinatedAbuseAlerts": [...]
}
```

### Opérations en lot (Admin)

#### POST `/moderation/ai/bulk-analyze`
Analyser tous les messages d'une conversation.

**Body:**
```json
{
  "matchId": "match-123",
  "limit": 50
}
```

**Réponse:**
```json
{
  "matchId": "match-123",
  "totalAnalyzed": 25,
  "flagged": 3,
  "results": [...]
}
```

## Algorithmes de détection

### 1. Détection de Toxicité

Détecte:
- Insultes et profanité
- Menaces de violence
- Contenu d'automutilation
- Harcèlement personnel

**Patterns:**
```typescript
- Insultes (con, débile, idiot) → 15 points
- Menaces (kill, murder, beat) → 20 points
- Automutilation → 25 points
- Insultes familiales → 10 points
```

**Score de décision:**
- 70+ = TOXIC (action requise)
- 40-70 = SUSPICIOUS (révision recommandée)
- <40 = SAFE

### 2. Détection de Harcèlement/Haine

Détecte:
- Généralisation discriminatoire
- Langage racial/religieux haineux
- Homophobie, sexisme
- Extrémisme religieux

**Score élevé:** 50+ points, action immédiate à 85+% de confiance

### 3. Détection de Spam

Détecte:
- Liens excessifs (3+ liens)
- Capitales excessives (3+ mots)
- Caractères répétitifs
- Mots-clés commerciaux

**Seuil:** 60+ = SPAM

### 4. Détection de Contenu Sexuel

Détecte:
- Références explicites
- Contenu d'escorte
- Sollicitation sexuelle
- Contenu NSFW

**Seuil:** 60+ = contenu sexuel flagrant, 70+ action requise

### 5. Détection de Fraude/Scam

Détecte:
- Demandes d'argent
- Arnaques héritages/loteries
- Phishing
- Liens/téléchargements suspects

**Seuil:** 60+ = scam suspectquence

### 6. Analyse Comportementale

Évalue:
- **Volume de messages** - 30+ messages en 24h = anomalie
- **Rapports reçus** - 3+ rapports/mois = signal d'alerte
- **Âge du compte** - <7 jours = nouveau compte (10 points)
- **Réputation** - <30 = basse réputation (10 points)
- **Patterns de blocage spam** - 3+ blocages = risque (15 points)

**Score de risque comportemental:** 0-100
- 80+ = Très haut risque
- 60-80 = Haut risque
- 40-60 = Risque modéré
- <40 = Bas risque

### 7. Détection d'Abus Coordonnés

Détecte les campagnes d'abus:
- Même raison de rapport (3+ rapports = 30 points)
- Mêmes reporters signalant différentes cibles (15-25 points)
- Nouveau compte avec pattern d'abus (bonus points)

**Confiance:** 0-100%, action à 50%+, investigation à 60%+

## Flux de travail

### 1. Contenu arrivant

```
Utilisateur envoie un message
    ↓
analyzeContent() exécuté automatiquement
    ↓
ContentAnalysis créée et sauvegardée
    ↓
Besoin de révision humaine?
    ├─ OUI → ModerationReviewQueue créée
    └─ NON → Fin
```

### 2. Révision humaine

```
Item dans la file de révision
    ↓
Admin assigné (optionnel)
    ↓
Admin examine le contenu
    ↓
Décision: APPROVED, REJECTED, ou ESCALATED
    ├─ REJECTED → ModerationAction créée
    │   ├─ WARNING → Envoyer notification
    │   ├─ RESTRICT → Limiter l'accès
    │   ├─ SUSPEND → Suspension temporaire
    │   └─ BAN → Bannissement permanent
    └─ APPROVED → Contenu accepté
```

### 3. Actions automatiques (Haute confiance)

```
Confiance ≥ 85% ET Sévérité = CRITICAL
    ↓
Action suggérée = "RESTRICT" ou "BAN"
    ↓
ModerationAction créée avec auto-triggered flag
    ↓
Utilisateur notifié
    ↓
Peut faire appel
```

## Configuration et Paramétrages

### Ajuster les seuils

Pour modifier les seuils de détection, éditer les constantes dans `advanced-moderation.service.ts`:

```typescript
// Seuils d'analyse
const TOXICITY_HIGH_THRESHOLD = 70;        // Toxicité → action
const CONFIDENCE_AUTO_ACTION = 85;         // Confiance pour action auto
const COORDINATED_ABUSE_THRESHOLD = 3;    // Rapports pour alerte
```

### Actions par défaut

Pour modifier les actions suggérées:

```typescript
// Dans le switch de classification
if (classification === ContentClassification.TOXIC && confidence >= 75) {
  suggestedAction = "WARNING";  // Changer à "RESTRICT" si plus strict
}
```

## Monitoring et Maintenance

### Vérifier la santé

```bash
# Voir les métriques
GET /moderation/ai/metrics?days=1

# Vérifier la file de révision
GET /moderation/ai/queue?status=PENDING

# Analyser les utilisateurs à risque
GET /moderation/ai/user/:userId/behavior
```

### Améliorer la précision

1. **Réviser les faux positifs:**
   - Analyser les appels approuvés
   - Ajouter des exceptions aux patterns

2. **Détecter les faux négatifs:**
   - Vérifier les rapports d'utilisateurs
   - Ajouter de nouveaux patterns de détection

3. **Affiner les seuils:**
   - Basé sur les métriques réelles
   - Tester avant de déployer

## Migration de la base de données

```bash
# Créer la migration
npx prisma migrate dev --name add_ai_moderation

# En production
npx prisma migrate deploy
```

## Intégration avec les messages

Pour analyser les messages avant envoi:

```typescript
// Dans message.service.ts
const analysis = await analyzeContent(messageText, senderId);
if (analysis.classification !== ContentClassification.SAFE) {
  if (analysis.confidence >= 95) {
    return { blocked: true, reason: "Contenu non autorisé" };
  }
}
```

## Recours (Appeals)

Les utilisateurs peuvent contester les actions via `/moderation/appeal`:

```json
{
  "identifier": "user@email.com",
  "message": "Je pense qu'il y a une erreur..."
}
```

L'admin peut résoudre avec:
```json
{
  "decision": "APPROVED",
  "note": "Action levée après révision"
}
```

## Limitations actuelles

- Basé sur des patterns et règles (pas de ML)
- Peut avoir des faux positifs/négatifs
- Nécessite un tuning régulier
- Limité à la détection textuelle

## Améliorations futures

- [ ] Détection d'images (OCR pour images)
- [ ] ML avec fine-tuning sur données Kongo Love
- [ ] Détection multilingue améliorée
- [ ] GraphQL API pour les admins
- [ ] Dashboard Web avancé
- [ ] Intégration avec services tiers (Perspective API)
- [ ] Machine Learning pour optimisation continue

## Support et Documentation

Pour plus d'informations:
- API Documentation: [Voir API.md](../API.md)
- Schéma DB: [Voir schema.prisma](../../prisma/schema.prisma)
- Tests: [Voir tests/](../../tests/)

---

**Dernière mise à jour:** 2024-01-15
**Version:** 1.0.0
