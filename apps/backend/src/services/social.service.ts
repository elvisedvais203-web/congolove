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
