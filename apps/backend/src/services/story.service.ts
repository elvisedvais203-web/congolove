import { prisma } from "../config/db";

export async function publishStory(input: {
  userId: string;
  mediaUrl: string;
  mediaType: "IMAGE" | "VIDEO";
  visibility?: "PUBLIC" | "FOLLOWERS";
  caption?: string;
}) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const story = await prisma.story.create({
    data: {
      userId: input.userId,
      mediaUrl: input.mediaUrl,
      mediaType: input.mediaType,
      visibility: input.visibility ?? "PUBLIC",
      caption: input.caption,
      expiresAt
    }
  });

  const followers = await prisma.follow.findMany({
    where: { followingId: input.userId, approved: true },
    select: { followerId: true }
  });

  if (followers.length > 0) {
    await prisma.auditLog.createMany({
      data: followers.map((item) => ({
        userId: item.followerId,
        action: "STORY_NEW_FOR_FOLLOWER",
        method: "SYSTEM",
        path: "/stories",
        statusCode: 200,
        metadata: {
          storyId: story.id,
          authorId: input.userId,
          visibility: story.visibility
        }
      }))
    });
  }

  return story;
}

export async function getStoryFeed(userId: string) {
  const stories = await prisma.story.findMany({
    where: {
      expiresAt: { gt: new Date() },
      OR: [
        { userId },
        {
          visibility: "PUBLIC",
          user: {
            profile: {
              is: { isPrivate: false }
            }
          }
        },
        {
          visibility: "FOLLOWERS",
          user: {
            followers: {
              some: {
                followerId: userId,
                approved: true
              }
            }
          }
        }
      ]
    },
    include: {
      user: { include: { profile: true, photos: true } },
      viewers: true
    },
    orderBy: { createdAt: "desc" }
  });

  return stories.map((story) => ({
    ...story,
    viewCount: story.viewers.length
  }));
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
