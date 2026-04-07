import { prisma } from "../config/db";

export async function followUser(followerId: string, followingId: string) {
  if (followerId === followingId) {
    throw new Error("Impossible de s abonner a soi-meme");
  }

  return prisma.follow.upsert({
    where: {
      followerId_followingId: { followerId, followingId }
    },
    create: { followerId, followingId, approved: true },
    update: { approved: true }
  });
}

export async function unfollowUser(followerId: string, followingId: string) {
  return prisma.follow.deleteMany({
    where: { followerId, followingId }
  });
}

export async function getMyNetwork(userId: string) {
  const [followers, following] = await Promise.all([
    prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: { include: { profile: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: { include: { profile: true } } },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return { followers, following };
}

export async function getSuggestions(userId: string, limit: number) {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true }
  });

  const excluded = following.map((x) => x.followingId).concat(userId);

  return prisma.profile.findMany({
    where: { userId: { notIn: excluded } },
    include: { user: { select: { id: true, photos: true, reputation: true } } },
    take: limit
  });
}

export async function listFeedPosts(userId: string, limit: number) {
  const following = await prisma.follow.findMany({
    where: { followerId: userId, approved: true },
    select: { followingId: true }
  });
  const authorIds = following.map((item) => item.followingId).concat(userId);

  const posts = await prisma.feedPost.findMany({
    where: { authorId: { in: authorIds } },
    include: {
      author: { include: { profile: true, photos: { where: { isPrimary: true }, take: 1 } } },
      likes: true,
      comments: {
        include: {
          user: { include: { profile: true, photos: { where: { isPrimary: true }, take: 1 } } }
        },
        orderBy: { createdAt: "asc" },
        take: 6
      }
    },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 40)
  });

  return posts.map((post) => ({
    id: post.id,
    content: post.content,
    mediaUrl: post.mediaUrl,
    createdAt: post.createdAt,
    author: {
      id: post.author.id,
      displayName: post.author.profile?.displayName ?? post.author.phone,
      avatarUrl: post.author.photos[0]?.url ?? null
    },
    likesCount: post.likes.length,
    likedByMe: post.likes.some((item) => item.userId === userId),
    comments: post.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      user: {
        id: comment.user.id,
        displayName: comment.user.profile?.displayName ?? comment.user.phone,
        avatarUrl: comment.user.photos[0]?.url ?? null
      }
    }))
  }));
}

export async function createFeedPost(userId: string, input: { content: string; mediaUrl?: string }) {
  const content = String(input.content ?? "").trim();
  if (content.length < 1) {
    throw new Error("Contenu du post requis.");
  }

  return prisma.feedPost.create({
    data: {
      authorId: userId,
      content,
      mediaUrl: input.mediaUrl ? String(input.mediaUrl).trim() : undefined
    }
  });
}

export async function toggleFeedLike(userId: string, postId: string) {
  const existing = await prisma.feedPostLike.findUnique({
    where: { postId_userId: { postId, userId } }
  });

  if (existing) {
    await prisma.feedPostLike.delete({ where: { id: existing.id } });
    return { liked: false };
  }

  await prisma.feedPostLike.create({ data: { postId, userId } });
  return { liked: true };
}

export async function commentFeedPost(userId: string, postId: string, content: string) {
  const normalized = String(content ?? "").trim();
  if (normalized.length < 1) {
    throw new Error("Commentaire requis.");
  }

  return prisma.feedPostComment.create({
    data: {
      postId,
      userId,
      content: normalized
    }
  });
}
