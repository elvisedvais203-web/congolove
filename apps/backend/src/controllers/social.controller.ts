import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { followUser, getMyNetwork, getSuggestions, unfollowUser } from "../services/social.service";

export async function follow(req: AuthRequest, res: Response) {
  const followerId = req.user!.userId;
  const { followingId } = req.body as { followingId: string };
  const data = await followUser(followerId, followingId);
  res.status(201).json(data);
}

export async function unfollow(req: AuthRequest, res: Response) {
  const followerId = req.user!.userId;
  const { followingId } = req.body as { followingId: string };
  const data = await unfollowUser(followerId, followingId);
  res.json(data);
}

export async function network(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const data = await getMyNetwork(userId);
  res.json(data);
}

export async function suggestions(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const limit = Number(req.query.limit ?? 12);
  const data = await getSuggestions(userId, limit);
  res.json(data);
}
