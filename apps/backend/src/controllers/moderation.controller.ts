import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { prisma } from "../config/db";

export async function reportUser(req: AuthRequest, res: Response) {
  const reporterId = req.user!.userId;
  const { reportedUserId, reason } = req.body as { reportedUserId: string; reason: string };

  const report = await prisma.userReport.create({
    data: { reporterId, reportedUserId, reason }
  });

  await prisma.user.update({
    where: { id: reportedUserId },
    data: { reputation: { decrement: 2 } }
  });

  res.status(201).json(report);
}

export async function adminStats(_req: AuthRequest, res: Response) {
  const [users, matches, messages, reports] = await Promise.all([
    prisma.user.count(),
    prisma.match.count(),
    prisma.message.count(),
    prisma.userReport.count()
  ]);

  res.json({ users, matches, messages, reports });
}

export async function suspiciousUsers(_req: AuthRequest, res: Response) {
  const users = await prisma.user.findMany({
    where: {
      OR: [{ reputation: { lt: 35 } }, { reportsReceived: { some: {} } }]
    },
    include: {
      profile: true,
      reportsReceived: true
    },
    take: 50,
    orderBy: { reputation: "asc" }
  });

  res.json(users);
}

export async function reviewMessages(req: AuthRequest, res: Response) {
  const matchId = String(req.query.matchId ?? "");
  const messages = await prisma.message.findMany({
    where: matchId ? { matchId } : {},
    include: {
      sender: { include: { profile: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  res.json(messages);
}
