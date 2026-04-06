import { prisma } from "../config/db";

function scoreCandidate(currentUser: { latitude?: number | null; longitude?: number | null; interests: string[] }, candidate: { latitude?: number | null; longitude?: number | null; interests: string[]; lastActiveAt: Date }): number {
  const commonInterests = currentUser.interests.filter((i) => candidate.interests.includes(i)).length;
  const activeHours = (Date.now() - candidate.lastActiveAt.getTime()) / (1000 * 60 * 60);
  const activityScore = Math.max(0, 10 - activeHours);

  let geoScore = 5;
  if (
    currentUser.latitude != null &&
    currentUser.longitude != null &&
    candidate.latitude != null &&
    candidate.longitude != null
  ) {
    const roughDistance =
      Math.abs(currentUser.latitude - candidate.latitude) +
      Math.abs(currentUser.longitude - candidate.longitude);
    geoScore = Math.max(0, 10 - roughDistance * 4);
  }

  return commonInterests * 5 + activityScore + geoScore;
}

export async function getDiscoveryFeed(userId: string, limit: number) {
  const userProfile = await prisma.profile.findUnique({ where: { userId } });
  if (!userProfile) {
    return [];
  }

  const likedOrPassed = await prisma.like.findMany({
    where: { fromUserId: userId },
    select: { toUserId: true }
  });

  const excludedIds = likedOrPassed.map((l: { toUserId: string }) => l.toUserId).concat(userId);

  const candidates = await prisma.profile.findMany({
    where: { userId: { notIn: excludedIds } },
    include: { user: { select: { id: true, planTier: true, photos: true } } },
    take: 100
  });

  return candidates
    .map((p: (typeof candidates)[number]) => ({ profile: p, score: scoreCandidate(userProfile, p) }))
    .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
    .slice(0, limit);
}

export async function swipe(userId: string, targetUserId: string, action: "LIKE" | "PASS") {
  await prisma.like.upsert({
    where: {
      fromUserId_toUserId: {
        fromUserId: userId,
        toUserId: targetUserId
      }
    },
    create: {
      fromUserId: userId,
      toUserId: targetUserId,
      action
    },
    update: {
      action
    }
  });

  if (action !== "LIKE") {
    return { matched: false };
  }

  const reciprocal = await prisma.like.findUnique({
    where: {
      fromUserId_toUserId: {
        fromUserId: targetUserId,
        toUserId: userId
      }
    }
  });

  if (reciprocal?.action === "LIKE") {
    const [a, b] = [userId, targetUserId].sort();
    const match = await prisma.match.upsert({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      create: { userAId: a, userBId: b },
      update: {}
    });

    return { matched: true, match };
  }

  return { matched: false };
}

export async function getCompatibilityScore(userId: string, targetUserId: string) {
  const [mine, target] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.profile.findUnique({ where: { userId: targetUserId } })
  ]);

  if (!mine || !target) {
    return {
      percent: 0,
      reasons: ["profil incomplet"]
    };
  }

  const mineInterests = mine.interests.map((value) => value.toLowerCase());
  const targetInterests = target.interests.map((value) => value.toLowerCase());
  const commonInterests = mineInterests.filter((interest) => targetInterests.includes(interest));

  const commonRatio = mineInterests.length
    ? commonInterests.length / Math.max(1, Math.min(mineInterests.length, targetInterests.length || 1))
    : 0;

  const cityMatch = Boolean(mine.city && target.city && mine.city.toLowerCase() === target.city.toLowerCase());

  const activityGapHours = Math.abs(mine.lastActiveAt.getTime() - target.lastActiveAt.getTime()) / (1000 * 60 * 60);
  const activityScore = Math.max(0, 1 - activityGapHours / 48);

  const raw = commonRatio * 0.62 + (cityMatch ? 0.2 : 0) + activityScore * 0.18;
  const percent = Math.max(1, Math.min(99, Math.round(raw * 100)));

  const reasons = [
    commonInterests.length > 0 ? `${commonInterests.length} interets en commun` : "profils differents",
    cityMatch ? "meme ville" : "ville differente",
    activityScore > 0.55 ? "rythme d'activite proche" : "rythme d'activite different"
  ];

  return { percent, reasons };
}
