import { Response } from "express";
import { AuthRequest } from "../middleware/nextalkauth";
import { cleanupExpiredStories, getStoryFeed, publishStory, viewStory } from "../services/nextalkstory.service";

export async function createStory(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const { mediaUrl, mediaType, caption, visibility } = req.body as {
    mediaUrl: string;
    mediaType: "IMAGE" | "VIDEO";
    caption?: string;
    visibility?: "PUBLIC" | "FOLLOWERS";
  };

  const story = await publishStory({ userId, mediaUrl, mediaType, caption, visibility });
  res.status(201).json(story);
}

export async function feedStories(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const stories = await getStoryFeed(userId);
  res.json(stories);
}

export async function markStoryViewed(req: AuthRequest, res: Response) {
  const viewerId = req.user!.userId;
  const { storyId } = req.body as { storyId: string };
  const data = await viewStory(storyId, viewerId);
  res.status(201).json(data);
}

export async function cleanupStories(_req: AuthRequest, res: Response) {
  const deleted = await cleanupExpiredStories();
  res.json(deleted);
}
