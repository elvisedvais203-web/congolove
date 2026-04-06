import { prisma } from "../config/db";

export type AiPreferencesInput = {
  interests?: string[];
  city?: string;
  lookingFor?: "SERIOUS" | "FUN" | "FRIENDSHIP";
  contentModes?: Array<"PEOPLE" | "PHOTO" | "VIDEO">;
  displayName?: string;
};

type IcebreakerInput = {
  chatId?: string;
};

function normalizeInterests(values?: string[]): string[] {
  if (!values?.length) {
    return [];
  }
  const unique = new Set(
    values
      .map((value) => String(value).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12)
  );
  return [...unique];
}

function scoreByInterests(targetInterests: string[], candidateInterests: string[]): number {
  if (!targetInterests.length || !candidateInterests.length) {
    return 0;
  }
  return targetInterests.filter((interest) => candidateInterests.includes(interest)).length * 6;
}

function toCompatibilityPercent(rawScore: number) {
  return Math.max(35, Math.min(98, Math.round(rawScore * 8 + 30)));
}

export async function saveAiPreferences(userId: string, input: AiPreferencesInput) {
  const interests = normalizeInterests(input.interests);

  const current = await prisma.profile.findUnique({ where: { userId } });
  if (!current) {
    return null;
  }

  const mergedInterests = [...new Set([...current.interests.map((i) => i.toLowerCase()), ...interests])].slice(0, 20);

  const profile = await prisma.profile.update({
    where: { userId },
    data: {
      displayName: input.displayName?.trim() || current.displayName,
      city: input.city?.trim() || current.city,
      interests: mergedInterests
    }
  });

  return profile;
}

export async function getAiRecommendations(userId: string, input: AiPreferencesInput) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { user: { select: { id: true } } }
  });

  if (!profile) {
    return {
      people: [],
      stories: [],
      media: []
    };
  }

  const targetInterests = [...new Set([...profile.interests.map((i) => i.toLowerCase()), ...normalizeInterests(input.interests)])];
  const targetCity = input.city?.trim().toLowerCase() || profile.city?.toLowerCase() || "";

  const likes = await prisma.like.findMany({ where: { fromUserId: userId }, select: { toUserId: true } });
  const excludedIds = likes.map((item) => item.toUserId).concat(userId);

  const candidates = await prisma.profile.findMany({
    where: { userId: { notIn: excludedIds } },
    include: {
      user: {
        select: {
          id: true,
          planTier: true,
          photos: { where: { isPrimary: true }, take: 1 }
        }
      }
    },
    take: 80
  });

  const people = candidates
    .map((candidate) => {
      const cityScore = targetCity && candidate.city?.toLowerCase() === targetCity ? 4 : 0;
      const score = scoreByInterests(targetInterests, candidate.interests.map((i) => i.toLowerCase())) + cityScore;
      return {
        id: candidate.userId,
        displayName: candidate.displayName,
        city: candidate.city,
        interests: candidate.interests,
        avatarUrl: candidate.user.photos[0]?.url ?? null,
        planTier: candidate.user.planTier,
        score,
        compatibilityPercent: toCompatibilityPercent(score)
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const recentStories = await prisma.story.findMany({
    where: { userId: { not: userId } },
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { displayName: true, city: true, interests: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 40
  });

  const stories = recentStories
    .map((story) => {
      const p = story.user.profile;
      const cityScore = targetCity && p?.city?.toLowerCase() === targetCity ? 3 : 0;
      const score = scoreByInterests(targetInterests, (p?.interests ?? []).map((i) => i.toLowerCase())) + cityScore;
      return {
        id: story.id,
        userId: story.userId,
        displayName: p?.displayName ?? "Story",
        city: p?.city ?? null,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        caption: story.caption,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const primaryPhotos = await prisma.photo.findMany({
    where: {
      userId: { not: userId }
    },
    include: {
      user: {
        select: {
          id: true,
          profile: { select: { displayName: true, city: true, interests: true } }
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 60
  });

  const media = primaryPhotos
    .map((photo) => {
      const p = photo.user.profile;
      const cityScore = targetCity && p?.city?.toLowerCase() === targetCity ? 2 : 0;
      const score = scoreByInterests(targetInterests, (p?.interests ?? []).map((i) => i.toLowerCase())) + cityScore;
      return {
        id: photo.id,
        userId: photo.userId,
        displayName: p?.displayName ?? "Profil",
        city: p?.city ?? null,
        mediaUrl: photo.url,
        mediaType: "PHOTO",
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 18);

  return {
    people,
    stories,
    media
  };
}

export async function generateIcebreakers(userId: string, input: IcebreakerInput) {
  const me = await prisma.profile.findUnique({ where: { userId } });
  if (!me) {
    return { items: ["Salut, comment se passe ta journee ?"] };
  }

  let otherProfile: { displayName: string; city: string | null; interests: string[] } | null = null;

  if (input.chatId) {
    const chat = await prisma.chat.findUnique({
      where: { id: input.chatId },
      include: {
        members: {
          include: {
            user: {
              include: { profile: true }
            }
          }
        }
      }
    });

    const other = chat?.members.find((member) => member.userId !== userId)?.user.profile;
    if (other) {
      otherProfile = {
        displayName: other.displayName,
        city: other.city,
        interests: other.interests
      };
    }
  }

  const commonInterests = otherProfile
    ? me.interests
        .map((value) => value.toLowerCase())
        .filter((interest) => otherProfile!.interests.map((v) => v.toLowerCase()).includes(interest))
    : [];

  const firstCommon = commonInterests[0];
  const cityHint = otherProfile?.city || me.city || "ta ville";
  const name = otherProfile?.displayName || "toi";

  const items = [
    firstCommon
      ? `J'ai vu qu'on aime tous les deux ${firstCommon}. Tu as une recommandation a me partager ?`
      : `Salut ${name}, quelle est la meilleure activite a faire ce week-end a ${cityHint} ?`,
    `Question rapide: tu es plus sortie tranquille ou aventure improvisee ?`,
    `Si on se rencontre, tu preferes un cafe, une balade ou un event ?`,
    `Qu'est-ce qui te fait vraiment te sentir en confiance avec quelqu'un ?`
  ];

  return { items };
}
