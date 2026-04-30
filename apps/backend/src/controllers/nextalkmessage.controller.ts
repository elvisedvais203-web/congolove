import { MessageType } from "@prisma/client";
import { Response } from "express";
import { AuthRequest } from "../middleware/nextalkauth";
import { prisma } from "../config/nextalkdb";
import { saveMessage } from "../services/nextalkmessage.service";

export async function listMessages(req: AuthRequest, res: Response) {
  const matchId = String(req.query.matchId);
  const page = Number(req.query.page ?? 1);
  const take = Number(req.query.take ?? 20);
  const skip = (page - 1) * take;

  const messages = await prisma.message.findMany({
    where: { matchId },
    orderBy: { createdAt: "desc" },
    take,
    skip
  });

  res.json(messages);
}

export async function markRead(req: AuthRequest, res: Response) {
  const { messageId } = req.body as { messageId: string };
  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { isRead: true, readAt: new Date() }
  });

  res.json(updated);
}

export async function createMessage(req: AuthRequest, res: Response) {
  const { matchId, type, text, mediaUrl } = req.body as {
    matchId: string;
    type: MessageType;
    text?: string;
    mediaUrl?: string;
  };

  const message = await saveMessage({
    matchId,
    senderId: req.user!.userId,
    type,
    text,
    mediaUrl,
    planTier: req.user!.planTier
  });

  res.status(201).json(message);
}
