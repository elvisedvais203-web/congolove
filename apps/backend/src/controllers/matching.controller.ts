import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { getCompatibilityScore, getDiscoveryFeed, swipe } from "../services/matching.service";

export async function discovery(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const limit = Number(req.query.limit ?? 20);
  const feed = await getDiscoveryFeed(userId, limit);
  res.json(feed);
}

export async function doSwipe(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { targetUserId, action } = req.body as { targetUserId: string; action: "LIKE" | "PASS" };
  const result = await swipe(userId, targetUserId, action);
  res.json(result);
}

export async function compatibility(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const targetUserId = String(req.params.targetUserId ?? "").trim();
  const result = await getCompatibilityScore(userId, targetUserId);
  res.json(result);
}
