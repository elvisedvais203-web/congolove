import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { commentFeedPost, createFeedPost, followUser, getMyNetwork, getSuggestions, listFeedPosts, toggleFeedLike, unfollowUser } from "../services/social.service";

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

export async function feed(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const limit = Number(req.query.limit ?? 20);
  const data = await listFeedPosts(userId, limit);
  res.json(data);
}

export async function createPost(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { content, mediaUrl } = req.body as { content: string; mediaUrl?: string };
  const data = await createFeedPost(userId, { content, mediaUrl });
  res.status(201).json(data);
}

export async function toggleLike(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const postId = String(req.params.postId);
  const data = await toggleFeedLike(userId, postId);
  res.json(data);
}

export async function addComment(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const postId = String(req.params.postId);
  const content = String(req.body?.content ?? "");
  const data = await commentFeedPost(userId, postId, content);
  res.status(201).json(data);
}
