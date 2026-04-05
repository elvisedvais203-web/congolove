import { prisma } from "../config/db";

export async function publishStory(input: {
  userId: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  caption?: string;
}) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  return prisma.story.create({
    data: {
      userId: input.userId,
      mediaUrl: input.mediaUrl,
      mediaType: input.mediaType,
      caption: input.caption,
      expiresAt
    }
  });
}

export async function getStoryFeed(userId: string) {
  const following = await prisma.follow.findMany({
    where: { followerId: userId, approved: true },
    select: { followingId: true }
  });

  const sourceIds = following.map((x) => x.followingId).concat(userId);

  return prisma.story.findMany({
    where: {
      userId: { in: sourceIds },
      expiresAt: { gt: new Date() }
    },
    include: {
      user: { include: { profile: true, photos: true } },
      viewers: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function viewStory(storyId: string, viewerId: string) {
  return prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId, viewerId } },
    create: { storyId, viewerId },
    update: { viewedAt: new Date() }
  });
}

export async function cleanupExpiredStories() {
  return prisma.story.deleteMany({
    where: { expiresAt: { lte: new Date() } }
  });
}
