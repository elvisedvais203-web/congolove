# API Quick Reference - Modération IA Avancée

## Base URL
```
http://localhost:3001/api/moderation/ai
```

## 1️⃣ Analyser un contenu
```bash
POST /analyze
Content-Type: application/json

{
  "contentType": "message",           # message|chatMessage|profile|story
  "contentId": "msg-123",
  "userId": "user-456",
  "text": "Texte à analyser..."
}
```

**Réponse (200):**
```json
{
  "analysis": {
    "classification": "TOXIC",        # SAFE|SUSPICIOUS|TOXIC|HATE_SPEECH|...
    "confidence": 85,                 # 0-100
    "severity": "HIGH",               # LOW|MEDIUM|HIGH|CRITICAL
    "toxicityScore": 85,
    "spamScore": 10,
    "scamScore": 0,
    "hateSpeechScore": 0,
    "sexualContentScore": 0,
    "violenceScore": 0,
    "reasons": ["Insultes détectées"],
    "suggestedAction": "RESTRICT",    # NONE|WARNING|HIDE|RESTRICT|BAN
    "requiresHumanReview": true
  },
  "contentAnalysisId": "analysis-789",
  "reviewQueueId": "analysis-789"
}
```

---

## 2️⃣ Obtenir la file de révision (Admin)
```bash
GET /queue?status=PENDING&priority=2&limit=50&offset=0
Authorization: Bearer {ADMIN_TOKEN}
```

**Paramètres:**
- `status` - PENDING|APPROVED|REJECTED|ESCALATED
- `priority` - 0|1|2|3 (bas à critique)
- `assignedTo` - userId du modérateur
- `limit` - nombre de résultats (défaut: 50)
- `offset` - décalage (défaut: 0)

**Réponse (200):**
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
      "assignedTo": null,
      "notes": null,
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

---

## 3️⃣ Assigner une révision (Admin)
```bash
POST /review/:reviewId/assign
Authorization: Bearer {ADMIN_TOKEN}
X-CSRF-Token: {CSRF_TOKEN}
Content-Type: application/json

{
  "assignedToAdminId": "admin-999"
}
```

**Réponse (200):**
```json
{
  "ok": true,
  "review": { /* review object */ }
}
```

---

## 4️⃣ Résoudre une révision (Admin)
```bash
POST /review/:reviewId/resolve
Authorization: Bearer {ADMIN_TOKEN}
X-CSRF-Token: {CSRF_TOKEN}
Content-Type: application/json

{
  "decision": "REJECTED",             # APPROVED|REJECTED|ESCALATED
  "actionType": "RESTRICT",           # NONE|WARNING|HIDE|RESTRICT|SUSPEND|BAN
  "reason": "Contenu toxique confirmé",
  "notes": "Compte déjà averti 2 fois"
}
```

**Réponse (200):**
```json
{
  "ok": true,
  "review": {
    "status": "REJECTED",
    "actionTaken": "RESTRICT",
    "resolvedAt": "2024-01-15T11:00:00Z"
  }
}
```

---

## 5️⃣ Analyser le comportement d'un utilisateur (Admin)
```bash
GET /user/:userId/behavior
Authorization: Bearer {ADMIN_TOKEN}
```

**Réponse (200):**
```json
{
  "userId": "user-123",
  "behavior": {
    "messagesLast24h": 45,
    "messagesLastWeek": 250,
    "chatMessages24h": 120,
    "chatMessagesWeek": 500,
    "reportsReceived": 5,
    "reportsReceivedMonth": 3,
    "spamBlocks": 3,
    "accountAgeMs": 1234567890,
    "reputation": 35,
    "behaviorRiskScore": 72,
    "flags": {
      "highMessageVolume": true,
      "multipleReports": true,
      "newAccount": false,
      "lowReputation": true,
      "spamPattern": true,
      "possibleCoordinatedAbuse": false
    }
  },
  "coordinatedAbuseDetected": {
    "detected": true,
    "confidence": 65,
    "susiciousReporters": [
      {
        "userId": "reporter-1",
        "reason": "harassment",
        "count": 3
      }
    ]
  },
  "metric": {
    "id": "metric-123",
    "userId": "user-123",
    "behaviorRiskScore": 72,
    "lastAnalyzedAt": "2024-01-15T11:05:00Z"
  }
}
```

---

## 6️⃣ Obtenir les métriques de modération (Admin)
```bash
GET /metrics?days=7
Authorization: Bearer {ADMIN_TOKEN}
```

**Paramètres:**
- `days` - Nombre de jours à couvrir (défaut: 7)

**Réponse (200):**
```json
{
  "period": {
    "startDate": "2024-01-08T00:00:00Z",
    "endDate": "2024-01-15T00:00:00Z",
    "days": 7
  },
  "contentAnalysis": {
    "SAFE": 8500,
    "SUSPICIOUS": 180,
    "TOXIC": 150,
    "HATE_SPEECH": 45,
    "SEXUAL_CONTENT": 30,
    "VIOLENCE": 15,
    "SPAM": 320,
    "SCAM": 25
  },
  "moderationActions": {
    "WARNING": 30,
    "HIDE_CONTENT": 15,
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
      "id": "user-abc",
      "displayName": "Suspicious User",
      "phone": "+243123456789",
      "behaviorRiskScore": 85,
      "flags": {
        "highMessageVolume": true,
        "multipleReports": true,
        "newAccount": false,
        "lowReputation": true,
        "spamPattern": true,
        "possibleCoordinatedAbuse": true
      }
    }
  ],
  "coordinatedAbuseAlerts": [
    {
      "id": "alert-123",
      "targetUser": {
        "id": "user-target",
        "displayName": "Harassed User",
        "phone": "+243987654321"
      },
      "reportCount": 12,
      "uniqueReportersCount": 8,
      "confidence": 85,
      "detectedAt": "2024-01-14T15:30:00Z"
    }
  ],
  "metrics": {
    "id": "metrics-2024-01-15",
    "date": "2024-01-15T00:00:00Z",
    "totalContentAnalyzed": 9265,
    "toxicDetected": 150,
    "hateSpeechDetected": 45,
    "spamDetected": 320,
    "scamDetected": 25,
    "sexualContentDetected": 30,
    "actionsApproved": 120,
    "actionsRejected": 45,
    "autoActionsTaken": 15
  }
}
```

---

## 7️⃣ Analyser en lot (Admin)
```bash
POST /bulk-analyze
Authorization: Bearer {ADMIN_TOKEN}
X-CSRF-Token: {CSRF_TOKEN}
Content-Type: application/json

{
  "matchId": "match-123",
  "limit": 50
}
```

**Réponse (200):**
```json
{
  "matchId": "match-123",
  "totalAnalyzed": 25,
  "flagged": 3,
  "results": [
    {
      "messageId": "msg-1",
      "senderId": "user-1",
      "analysis": {
        "classification": "SAFE",
        "confidence": 95,
        "severity": "LOW"
      },
      "contentAnalysisId": "analysis-1"
    },
    {
      "messageId": "msg-2",
      "senderId": "user-2",
      "analysis": {
        "classification": "TOXIC",
        "confidence": 80,
        "severity": "HIGH",
        "requiresHumanReview": true
      },
      "contentAnalysisId": "analysis-2"
    }
  ]
}
```

---

## 🔐 Codes d'erreur

| Code | Message | Solution |
|------|---------|----------|
| 400 | Paramètres manquants | Vérifier le body/query |
| 403 | Accès non autorisé | Admin token requis |
| 404 | Resource non trouvée | Vérifier les IDs |
| 409 | Conflit (déjà traité) | Révision déjà résolue |
| 500 | Erreur serveur | Consulter les logs |

---

## 🎯 Flux typique d'un modérateur

```
1. GET /queue?status=PENDING
   → Voir les items en attente

2. POST /review/:id/assign
   → S'assigner le travail

3. Examiner le contenu
   → Lire l'analyse, raison...

4. POST /review/:id/resolve
   → Approuver ou rejeter + action

5. GET /metrics
   → Voir les progrès du jour
```

---

## 📊 Classifications possibles

| Classification | Score | Action |
|---|---|---|
| **SAFE** | <20 | Aucune |
| **SUSPICIOUS** | 20-40 | Monitorer |
| **TOXIC** | 40+ | Avertir/Restreindre |
| **HATE_SPEECH** | 50+ | Action immédiate |
| **SEXUAL_CONTENT** | 60+ | Masquer |
| **VIOLENCE** | 50+ | Restreindre |
| **SPAM** | 60+ | Masquer |
| **SCAM** | 60+ | Restreindre |

---

## 🎨 Exemples cURL

### Analyser un message
```bash
curl -X POST http://localhost:3001/api/moderation/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "contentType": "message",
    "contentId": "msg-123",
    "userId": "user-456",
    "text": "Allez vous faire foutre!"
  }'
```

### Voir la file de révision
```bash
curl "http://localhost:3001/api/moderation/ai/queue?status=PENDING" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Résoudre une révision
```bash
curl -X POST http://localhost:3001/api/moderation/ai/review/review-123/resolve \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "X-CSRF-Token: YOUR_CSRF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "REJECTED",
    "actionType": "RESTRICT",
    "reason": "Contenu toxique confirmé"
  }'
```

### Analyser un utilisateur
```bash
curl "http://localhost:3001/api/moderation/ai/user/user-123/behavior" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Voir les métriques
```bash
curl "http://localhost:3001/api/moderation/ai/metrics?days=7" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## ⚡ Limites et performance

- ✅ Analyse <500ms par message
- ✅ Supports 10,000+ analyses/jour
- ⚠️ Bulk analyze limité à 50 messages
- ⚠️ File de révision: max 10,000 items
- 📊 Métriques mises à jour quotidiennement

---

**Dernière mise à jour:** 2024-01-15
