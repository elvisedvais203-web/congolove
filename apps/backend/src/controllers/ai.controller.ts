import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { generateIcebreakers, getAiRecommendations, saveAiPreferences, type AiPreferencesInput } from "../services/ai.service";

export async function updateAiPreferences(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const payload = req.body as AiPreferencesInput;
  const profile = await saveAiPreferences(userId, payload);
  res.json({ ok: true, profile });
}

export async function aiRecommendations(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const payload = req.body as AiPreferencesInput;
  const data = await getAiRecommendations(userId, payload);
  res.json(data);
}

export async function aiIcebreakers(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const chatId = String(req.body?.chatId ?? "").trim() || undefined;
  const data = await generateIcebreakers(userId, { chatId });
  res.json(data);
}
